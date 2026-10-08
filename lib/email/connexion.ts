import type { Langue } from "@/lib/db/types";
import { findUserSettings } from "@/lib/db/user-settings";
import { LONGUEUR_DU_CODE } from "@/lib/domain/code-de-connexion";
import { langueDesEnTetes } from "@/lib/i18n/langue-des-en-tetes";
import { sendEmail } from "./client";
import { renderCodeDeConnexion } from "./templates/code-de-connexion";

/**
 * L'envoi d'un code de connexion.
 *
 * Il ne passe **pas** par `sendNotification`, et c'est le point important de ce
 * fichier : cette fonction-là vérifie le refus d'emails de l'utilisateur, ce qui
 * est juste pour un rappel quotidien et catastrophique ici. Quelqu'un qui a
 * coupé ses rappels doit évidemment pouvoir encore entrer dans son compte — le
 * contraire l'enfermerait dehors avec un bouton qu'il a cliqué en toute bonne
 * foi.
 *
 * Il n'écrit rien non plus dans `EmailDelivery` : cette table existe pour rendre
 * un cron idempotent, un par type et par jour. Un code de connexion se demande
 * autant de fois qu'on veut, et deux demandes dans la même journée doivent
 * partir toutes les deux.
 */

/**
 * Durée de validité d'un code, en minutes.
 *
 * Plus courte que celle du lien qu'il remplace : six chiffres se devinent, là où
 * un jeton signé ne se devine pas. La fenêtre étroite fait le gros du travail,
 * le compte de tentatives fait le reste — voir `lib/auth/config.ts`.
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
 *
 * À l'inscription, personne n'a encore de réglage : le code part avant le
 * compte. On parle alors la langue que la personne a choisie sur le site — le
 * cookie posé par le lien de langue —, à défaut celle de son navigateur. Sans
 * requête du tout, le français, comme partout ailleurs.
 */
async function langueDuCode({ userId, entetes }: Provenance): Promise<Langue> {
  const duCompte = userId ? (await findUserSettings(userId))?.langue : undefined;

  if (duCompte) return duCompte;

  return langueDesEnTetes(entetes);
}

export async function envoyerLeCodeDeConnexion(
  destinataire: string,
  code: string,
  provenance: Provenance,
): Promise<void> {
  if (code.length !== LONGUEUR_DU_CODE) {
    // Un code de longueur inattendue veut dire que la configuration du plugin a
    // divergé de ce que l'écran de saisie attend : il vaut mieux ne pas partir.
    throw new Error(`Code de connexion de longueur inattendue : ${code.length}.`);
  }

  const email = renderCodeDeConnexion(
    { code, minutes: MINUTES_DE_VALIDITE },
    await langueDuCode(provenance),
  );

  await sendEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
    // Aucun en-tête de désabonnement : voir `code-de-connexion.ts`.
  });
}
