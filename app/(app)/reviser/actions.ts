"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { enregistrerRevision, reclamerSignalDeMaitrise } from "@/lib/db/revision";
import { compterDusDemain } from "@/lib/db/session-du-jour";
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

  const resultat = await enregistrerRevision({ userId: utilisateur.id, ...valide.data });

  if (!resultat) {
    return { ok: false, motif: "Ce concept est introuvable." };
  }

  return { ok: true, signal: resultat.signal };
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

  const reclame = await reclamerSignalDeMaitrise(utilisateur.id, valide.data);

  // Le tableau de bord compte les concepts dus : il vient de changer.
  revalidatePath(ROUTES.aujourdhui);

  return reclame;
}

/** Ce qui revient demain, une fois la session finie. */
export async function compterDemainAction(): Promise<number> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return 0;

  return compterDusDemain(utilisateur.id);
}
