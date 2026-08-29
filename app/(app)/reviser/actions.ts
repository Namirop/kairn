"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROUTES } from "@/lib/auth/routes";
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

  /*
    Le tableau et la liste des dépôts sont périmés dès cette réponse-là.

    Ils l'étaient déjà, et on ne le disait qu'à l'écran de fin de session : qui
    s'arrête en cours de route et prend la barre du bas retombait sur un
    décompte d'avant, avec les concepts déjà passés encore à faire. Le cas est
    ordinaire — on répond à trois questions et on va voir où l'on en est.

    Marqué ici plutôt qu'à la sortie, parce qu'il n'y a pas de sortie : on quitte
    par un lien, par un retour arrière, par la barre du bas, ou en fermant
    l'onglet. Le seul moment qu'on tient à coup sûr est celui où la donnée
    change, et il ne coûte rien — l'aller-retour a déjà lieu pour enregistrer.
  */
  revalidatePath(ROUTES.aujourdhui);
  revalidatePath(ROUTES.depots);

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

  // Pas de revalidation ici : ce n'est pas son sujet. La fin de session en
  // demande une, une seule fois, et pour tout ce qu'elle a déplacé — voir
  // `relireLeTableauAction`.
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

/**
 * Le tableau de bord est périmé : qu'il soit relu.
 *
 * Elle n'écrit rien — tout a déjà été écrit, réponse par réponse. Elle marque
 * seulement la page d'accueil comme à relire, sans quoi le client ressert celle
 * qu'il avait chargée avant la session : le compte de concepts dus d'avant, et
 * le travail qu'on vient de faire invisible jusqu'au rechargement.
 *
 * **Elle s'appelait `quitterLaSessionAction`, et c'est ce nom qui a fait revenir
 * le défaut deux fois.** Nommée d'après une porte, elle n'était appelée que par
 * cette porte-là : le jour où l'écran de fin en a ouvert trois autres — déposer,
 * s'entraîner, revenir à aujourd'hui —, aucune n'avait de raison de la connaître,
 * et le compteur est redevenu faux. Elle est maintenant nommée d'après son
 * effet, et l'invariant tient en une phrase :
 *
 * > **Tout ce qui sort d'une session appelle cette action avant de partir.**
 *
 * Il n'y a que deux sorties, et elles sont toutes les deux dans
 * `components/revision/` : `ArreterLa` pour l'abandon, `FinDeSession` pour
 * l'achèvement. La seconde l'appelle à son affichage plutôt qu'à chacun de ses
 * liens — quelle que soit la porte qu'on prenne ensuite, y compris la barre de
 * navigation, le tableau est déjà marqué.
 *
 * Ça suppose que l'écran de fin survive au rafraîchissement que la revalidation
 * déclenche sur la route courante. C'est le cas depuis que `/reviser` lui passe
 * l'écran vide en accessoire au lieu d'en décider lui-même — voir
 * `SessionDeRevision`.
 */
export async function relireLeTableauAction(): Promise<void> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return;

  revalidatePath(ROUTES.aujourdhui);
}
