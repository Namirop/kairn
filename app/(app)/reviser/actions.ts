"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import { reclamerSignalDeMaitrise } from "@/lib/db/carte-de-maitrise";
import { prendreUnGeste } from "@/lib/db/limite-de-gestes";
import { enregistrerRevision } from "@/lib/db/revision";
import { compterDusDemain } from "@/lib/db/session-du-jour";
import { signalerUneQuestion } from "@/lib/db/signalement";
import { lireFuseauUtilisateur, marquerEspacementVu } from "@/lib/db/reglages-du-compte";
import type { SignalDeMaitrise } from "@/lib/domain/signal-maitrise";
import type { Messages } from "@/lib/i18n/messages";

/** Chaque passage est écrit dès qu'il est donné ; la propriété est revérifiée à l'écriture. */

/** Au-delà, le temps ne dit plus rien du rappel (onglet resté ouvert) et fausserait la maîtrise. */
const TEMPS_MAXIMUM_MS = 15 * 60 * 1000;

/** La limite de débit est très au-dessus d'un humain : ce refus vise les automates. */
const TROP_VITE = "tropVite" satisfies keyof Messages["revision"]["session"]["serveur"];

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
  const utilisateur = await lireLUtilisateur();
  const t = await getTranslations("revision.session.serveur");

  if (!utilisateur) return { ok: false, motif: t("expiree") };

  const valide = reponseSchema.safeParse(donnees);

  if (!valide.success) {
    return { ok: false, motif: t("invalide") };
  }

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return { ok: false, motif: t(TROP_VITE) };
  }

  const resultat = await enregistrerRevision({ userId: utilisateur.id, ...valide.data });

  if (!resultat) {
    return { ok: false, motif: t("introuvable") };
  }

  // Ici et non à la sortie : une session se quitte par n'importe quelle porte,
  // seul le moment où la donnée change est sûr.
  revalidatePath(ROUTES.aujourdhui);
  revalidatePath(ROUTES.depots);

  return { ok: true, signal: resultat.signal };
}

const signalementSchema = z.object({
  variantId: z.string().min(1),
  motif: z.enum(["INCOMPREHENSIBLE", "FAUSSE", "HORS_SUJET", "TROP_FACILE"]),
  // Borné : une précision, pas un canal de discussion.
  commentaire: z.string().trim().max(500).default(""),
});

export type SignalementDonne = z.input<typeof signalementSchema>;

/**
 * Le contexte de diagnostic est relu en base, pour que le client ne puisse pas
 * l'arranger. Limite de débit : c'est une écriture répétable à volonté.
 */
export async function signalerAction(donnees: SignalementDonne): Promise<boolean> {
  const utilisateur = await lireLUtilisateur();

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

/** La base n'en marque qu'un : deux onglets sur la même session n'obtiennent pas deux cartes. */
export async function reclamerMaitriseAction(
  atomIds: string[],
): Promise<{ atomId: string; concept: string } | null> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) return null;

  const valide = reclamationSchema.safeParse(atomIds);

  if (!valide.success) return null;

  // Pas de revalidation : la fin de session la demande via `relireLeTableauAction`.
  return reclamerSignalDeMaitrise(utilisateur.id, valide.data);
}

/** Ce qui revient demain, une fois la session finie. */
export async function compterDemainAction(): Promise<number> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) return 0;

  return compterDusDemain(utilisateur.id);
}

/** À l'affichage : une explication qui revient jusqu'à l'accusé est une modale déguisée. */
export async function espacementVuAction(): Promise<void> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) return;

  await marquerEspacementVu(utilisateur.id);
}

/**
 * Sans elle, le client ressert l'accueil chargé avant la session. Invariant :
 * tout ce qui sort d'une session l'appelle (`ArreterLa`, et `FinDeSession` à son
 * affichage). Suppose que l'écran de fin survive au rafraîchissement : d'où
 * l'écran vide passé en accessoire à `SessionDeRevision` par `/reviser`.
 */
export async function relireLeTableauAction(): Promise<void> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) return;

  revalidatePath(ROUTES.aujourdhui);
}
