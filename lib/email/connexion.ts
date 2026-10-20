import type { Langue } from "@/lib/db/types";
import { trouverLesReglages } from "@/lib/db/reglages-du-compte";
import { LONGUEUR_DU_CODE } from "@/lib/domain/code-de-connexion";
import { langueDesEnTetes } from "@/lib/i18n/langue-des-en-tetes";
import { envoyerLEmail } from "./client";
import { composerLeCodeDeConnexion } from "./templates/code-de-connexion";

/**
 * Hors de `envoyerLaNotification` : couper ses rappels n'empêche pas d'entrer.
 * Rien dans `EmailDelivery`, idempotent par jour : deux codes le même jour
 * partent tous les deux.
 */

/**
 * Courte : six chiffres se devinent. La fenêtre fait le gros du travail, le
 * compte de tentatives le reste (`lib/auth/config.ts`).
 */
export const MINUTES_DE_VALIDITE = 10;

export type Provenance = {
  /** Absent à l'inscription. */
  userId: string | null;
  entetes: Headers | null;
};

/** Celle du compte, sinon celle de la requête : à l'inscription, le code part avant le compte. */
async function langueDuCode({ userId, entetes }: Provenance): Promise<Langue> {
  const duCompte = userId ? (await trouverLesReglages(userId))?.langue : undefined;

  if (duCompte) return duCompte;

  return langueDesEnTetes(entetes);
}

export async function envoyerLeCodeDeConnexion(
  destinataire: string,
  code: string,
  provenance: Provenance,
): Promise<void> {
  if (code.length !== LONGUEUR_DU_CODE) {
    // Le plugin a divergé de l'écran de saisie : pas de code impossible à saisir.
    throw new Error(`Code de connexion de longueur inattendue : ${code.length}.`);
  }

  const email = composerLeCodeDeConnexion(
    { code, minutes: MINUTES_DE_VALIDITE },
    await langueDuCode(provenance),
  );

  await envoyerLEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
    // Aucun en-tête de désabonnement : voir `ContenuDuGabarit.lienDeDesinscription`.
  });
}
