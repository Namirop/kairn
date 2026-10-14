import type { Langue } from "@/lib/db/types";
import { trouverLesReglages } from "@/lib/db/reglages-du-compte";
import { LONGUEUR_DU_CODE } from "@/lib/domain/code-de-connexion";
import { langueDesEnTetes } from "@/lib/i18n/langue-des-en-tetes";
import { envoyerLEmail } from "./client";
import { composerLeCodeDeConnexion } from "./templates/code-de-connexion";

/**
 * L'envoi d'un code de connexion.
 *
 * Il ne passe pas par `envoyerLaNotification`, qui respecte le refus d'emails :
 * quelqu'un qui a coupé ses rappels doit pouvoir entrer dans son compte.
 *
 * Il n'écrit rien dans `EmailDelivery`, qui rend un cron idempotent par type et
 * par jour : deux demandes de code le même jour doivent partir toutes les deux.
 */

/**
 * Durée de validité d'un code, en minutes. Courte parce que six chiffres se
 * devinent : la fenêtre étroite fait le gros du travail, le compte de
 * tentatives le reste (voir `lib/auth/config.ts`).
 */
export const MINUTES_DE_VALIDITE = 10;

/** Ce qu'on sait de qui demande le code, à l'instant où il le demande. */
export type Provenance = {
  /** Le compte de l'adresse, s'il existe déjà ; absent à l'inscription. */
  userId: string | null;
  /** Les en-têtes de la requête qui a demandé le code, quand il y en a une. */
  entetes: Headers | null;
};

/**
 * La langue du code : celle du compte s'il existe, sinon celle de la requête.
 * À l'inscription, le code part avant le compte : on lit alors le cookie de
 * langue, à défaut le navigateur, à défaut le français.
 */
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
    // La configuration du plugin a divergé de ce que l'écran de saisie attend :
    // mieux vaut ne pas envoyer un code impossible à saisir.
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
