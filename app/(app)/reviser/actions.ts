"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { reclamerSignalDeMaitrise } from "@/lib/db/carte-de-maitrise";
import { prendreUnGeste } from "@/lib/db/limite-de-gestes";
import { enregistrerRevision } from "@/lib/db/revision";
import { compterDusDemain } from "@/lib/db/session-du-jour";
import { signalerUneQuestion } from "@/lib/db/signalement";
import { lireFuseauUtilisateur, marquerEspacementVu } from "@/lib/db/user-settings";
import type { SignalDeMaitrise } from "@/lib/domain/signal-maitrise";

/**
 * Les gestes d'une session.
 *
 * Chaque passage est écrit dès qu'il est donné : la session ne garde rien en
 * mémoire pour l'envoyer à la fin. L'identifiant de l'utilisateur vient de la
 * session, jamais du client, et la propriété du concept est revérifiée à
 * l'écriture.
 */

/**
 * Borne haute du temps de réponse.
 *
 * Le chronomètre part à l'affichage et s'arrête à la validation, mais rien
 * n'empêche un onglet de rester ouvert une nuit. Au-delà d'un quart d'heure la
 * mesure ne dit plus rien sur le rappel : on la plafonne plutôt que d'enregistrer
 * un nombre qui fausserait le signal de maîtrise.
 */
const TEMPS_MAXIMUM_MS = 15 * 60 * 1000;

/**
 * Ce qu'on dit quand la limite de débit refuse un geste.
 *
 * Personne ne verra cette phrase en révisant : la limite est très au-dessus de
 * ce qu'un humain produit. Elle existe pour ce qui n'est pas humain, et elle
 * doit quand même savoir se dire.
 */
const TROP_VITE = "Trop de réponses coup sur coup. Laisse passer quelques secondes.";

const reponseSchema = z.object({
  atomId: z.string().min(1),
  variantId: z.string().min(1),
  note: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]),
  tempsMs: z.number().int().min(0).max(TEMPS_MAXIMUM_MS).catch(TEMPS_MAXIMUM_MS),
  maitrise: z.boolean(),
});

export type ReponseDonnee = z.input<typeof reponseSchema>;

export type ResultatReponse =
  { ok: true; signal: SignalDeMaitrise | null } | { ok: false; motif: string };

export async function repondreAction(donnees: ReponseDonnee): Promise<ResultatReponse> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return { ok: false, motif: "Ta session a expiré. Reconnecte-toi." };

  const valide = reponseSchema.safeParse(donnees);

  if (!valide.success) {
    return { ok: false, motif: "Cette réponse n'a pas pu être enregistrée." };
  }

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return { ok: false, motif: TROP_VITE };
  }

  const resultat = await enregistrerRevision({ userId: utilisateur.id, ...valide.data });

  if (!resultat) {
    return { ok: false, motif: "Ce concept est introuvable." };
  }

  return { ok: true, signal: resultat.signal };
}

const signalementSchema = z.object({
  variantId: z.string().min(1),
  motif: z.enum(["INCOMPREHENSIBLE", "FAUSSE", "HORS_SUJET", "TROP_FACILE"]),
  // Facultatif, et borné : c'est une précision, pas un canal de discussion.
  commentaire: z.string().trim().max(500).default(""),
});

export type SignalementDonne = z.input<typeof signalementSchema>;

/**
 * Signale une question qui ne va pas.
 *
 * Le client n'envoie que l'identifiant de la question et un motif. Tout le
 * contexte — la question, sa réponse, le concept, le format, la facette, le
 * modèle, l'empreinte du prompt — est relu en base : ce qui sert à diagnostiquer
 * ne doit pas pouvoir être arrangé par ce qui signale.
 *
 * La limite de débit s'applique comme aux autres gestes : c'est une écriture, et
 * elle est répétable autant qu'on veut sans coûter d'appel modèle.
 */
export async function signalerAction(donnees: SignalementDonne): Promise<boolean> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return false;

  const valide = signalementSchema.safeParse(donnees);

  if (!valide.success) return false;

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return false;
  }

  return signalerUneQuestion({
    userId: utilisateur.id,
    variantId: valide.data.variantId,
    motif: valide.data.motif,
    commentaire: valide.data.commentaire.length > 0 ? valide.data.commentaire : null,
  });
}

const reclamationSchema = z.array(z.string().min(1)).max(50);

/**
 * Réclame la carte de maîtrise à la fin de la session.
 *
 * Le client envoie les concepts qui l'ont méritée, dans l'ordre où ils sont
 * passés ; la base n'en marque qu'un. C'est elle qui tranche, pas le client :
 * deux onglets ouverts sur la même session n'obtiennent pas deux cartes.
 */
export async function reclamerMaitriseAction(
  atomIds: string[],
): Promise<{ atomId: string; concept: string } | null> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return null;

  const valide = reclamationSchema.safeParse(atomIds);

  if (!valide.success) return null;

  // Pas de revalidation : elle rafraîchirait la route courante, le serveur
  // rendrait une session désormais vide, et l'écran de fin disparaîtrait à
  // l'instant où il s'affiche. Le tableau de bord est rendu à la demande.
  return reclamerSignalDeMaitrise(utilisateur.id, valide.data);
}

/** Ce qui revient demain, une fois la session finie. */
export async function compterDemainAction(): Promise<number> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return 0;

  return compterDusDemain(utilisateur.id);
}

/**
 * L'espacement a été expliqué. Il ne le sera plus.
 *
 * Appelée à l'affichage de l'explication et non à sa lecture : rien ne dit
 * qu'elle a été lue, et une explication qui revient jusqu'à ce qu'on l'accuse
 * est une fenêtre modale déguisée.
 */
export async function espacementVuAction(): Promise<void> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return;

  await marquerEspacementVu(utilisateur.id);
}
