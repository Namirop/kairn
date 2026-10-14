/**
 * Le code à six chiffres qui ouvre une session, tel qu'on le saisit.
 *
 * Un code plutôt qu'un lien : un lien s'ouvre dans le navigateur par défaut, et
 * sur iOS une application installée ne peut ni l'intercepter ni partager le
 * stockage de Safari. Un code se saisit dans la fenêtre qui l'a demandé.
 *
 * Ce module ne fait que lire la saisie ; better-auth vérifie et compte les
 * tentatives.
 */

export const LONGUEUR_DU_CODE = 6;

/** Tout ce qui n'est pas un chiffre — espaces, tirets, texte recopié autour. */
const HORS_CHIFFRES = /\D/g;

/**
 * Les chiffres d'une saisie, au plus six.
 *
 * Le presse-papier rapporte souvent « 123 456 », un saut de ligne ou la phrase
 * entière : mieux vaut retirer le reste que refuser. On garde les premiers
 * chiffres, car le code précède en général d'autres nombres (« expire dans 10
 * minutes »).
 */
export function lireLeCode(saisie: string): string {
  return saisie.replace(HORS_CHIFFRES, "").slice(0, LONGUEUR_DU_CODE);
}

/** Un code complet, seul cas où l'envoi a une chance d'aboutir. */
export function codeComplet(saisie: string): boolean {
  return lireLeCode(saisie).length === LONGUEUR_DU_CODE;
}
