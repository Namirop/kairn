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

export function essaiSansLimite(): boolean {
  return process.env[VARIABLE_SANS_LIMITE]?.trim() === "true";
}
