/**
 * La saisie du code de connexion ; better-auth vérifie et compte les tentatives.
 * Un code plutôt qu'un lien : sur iOS, une application installée ne peut ni
 * intercepter un lien ni partager le stockage de Safari.
 */

export const LONGUEUR_DU_CODE = 6;

const HORS_CHIFFRES = /\D/g;

/**
 * Le presse-papier rapporte souvent espaces ou phrase entière : on filtre plutôt
 * que refuser. Les premiers chiffres, car le code précède en général d'autres
 * nombres (« expire dans 10 minutes »).
 */
export function lireLeCode(saisie: string): string {
  return saisie.replace(HORS_CHIFFRES, "").slice(0, LONGUEUR_DU_CODE);
}

/** Un code complet, seul cas où l'envoi a une chance d'aboutir. */
export function codeComplet(saisie: string): boolean {
  return lireLeCode(saisie).length === LONGUEUR_DU_CODE;
}
