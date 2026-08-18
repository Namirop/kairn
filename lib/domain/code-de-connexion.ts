/**
 * Le code à six chiffres qui ouvre une session, tel qu'on le saisit.
 *
 * Il a remplacé le lien pour une raison précise : un lien part du client mail,
 * donc le navigateur par défaut, donc jamais l'application installée. Sur iOS,
 * une application posée sur l'écran d'accueil ne peut pas intercepter un lien —
 * et son stockage est séparé de celui de Safari, si bien que la session créée
 * par le lien ne l'atteint pas. Un code, lui, se saisit dans la fenêtre qui l'a
 * demandé : la session s'y crée par construction.
 *
 * Ce module ne fait que **lire** ce qu'on lui donne. La vérification appartient
 * à better-auth, qui compare au code émis et compte les tentatives.
 */

export const LONGUEUR_DU_CODE = 6;

/** Tout ce qui n'est pas un chiffre — espaces, tirets, texte recopié autour. */
const HORS_CHIFFRES = /\D/g;

/**
 * Les chiffres d'une saisie, au plus six.
 *
 * On colle rarement six chiffres nus : le presse-papier rapporte « 123 456 »
 * quand le mail les espace, un saut de ligne quand la sélection déborde, et
 * parfois la phrase entière qui les porte. Retirer le reste vaut mieux que
 * refuser une saisie que l'utilisateur a bien lue.
 *
 * On garde les **premiers** chiffres et pas les derniers : dans « Code : 123456
 * — il expire dans 10 minutes », c'est le code qui vient en premier.
 */
export function lireLeCode(saisie: string): string {
  return saisie.replace(HORS_CHIFFRES, "").slice(0, LONGUEUR_DU_CODE);
}

/** Un code complet, seul cas où l'envoi a une chance d'aboutir. */
export function codeComplet(saisie: string): boolean {
  return lireLeCode(saisie).length === LONGUEUR_DU_CODE;
}
