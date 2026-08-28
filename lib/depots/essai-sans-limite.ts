/**
 * L'échappement qui rouvre l'essai anonyme, le temps de vérifier en ligne.
 *
 * Les deux verrous de l'essai — un dépôt par cookie de visite, deux visites par
 * empreinte d'adresse sur vingt-quatre heures glissantes — tiennent le budget,
 * mais rendent la landing intestable dès le troisième essai. Or c'est la seule
 * page qu'on ne peut éprouver qu'en production : le découpage n'y tourne pour de
 * vrai qu'avec la vraie clé, et un visiteur qui n'a pas de compte n'a aucun autre
 * chemin pour en déclencher un.
 *
 * **Absente, la variable laisse les deux verrous en place.** C'est un état qu'on
 * allume, jamais un défaut : le mécanisme se retire en supprimant la variable
 * chez l'hébergeur, sans toucher au code ni à ce fichier.
 *
 * Ce qu'elle n'ouvre pas : le plafond journalier d'appels au modèle, qui reste le
 * garde-fou du budget et ne se contourne d'aucune façon. Le pire qu'une variable
 * oubliée coûte est donc borné par `AI_DAILY_CALL_CAP` — mais elle serait oubliée
 * sur une page publique, alors chaque dépôt qu'elle laisse passer le dit dans le
 * journal.
 */

export const VARIABLE_SANS_LIMITE = "ESSAI_ANONYME_SANS_LIMITE";

/**
 * **C'est un interrupteur, pas un nombre**, et il n'y a que `true` qui l'allume.
 *
 * Posée à autre chose — un compte, une durée, `1`, `on` —, la variable ne fait
 * rien et l'essai continue de refuser comme si elle n'existait pas. C'est le bon
 * défaut : sur une page publique, une valeur mal comprise doit fermer la porte,
 * jamais l'ouvrir. Mais le silence, lui, était un mauvais défaut — on redéploie,
 * on retente, on relit ses cookies, et rien ne dit que c'est la valeur qui ne
 * convient pas.
 *
 * Une valeur présente et refusée se journalise donc. Une variable absente ne dit
 * rien : c'est l'état normal, et le dire à chaque dépôt noierait le reste.
 */
export function essaiSansLimite(): boolean {
  const pose = process.env[VARIABLE_SANS_LIMITE]?.trim();

  if (pose === undefined || pose.length === 0) return false;
  if (pose === "true") return true;

  console.warn(
    `[essai] ${VARIABLE_SANS_LIMITE}=${pose} : c'est un interrupteur, seul « true » l'allume — les verrous restent en place.`,
  );

  return false;
}
