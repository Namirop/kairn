/**
 * Ce qu'un texte déposé a le droit de faire, avec ou sans compte.
 *
 * Dans son propre fichier parce que l'écran en a besoin autant que le serveur :
 * le compteur du champ et le refus de Zod disent le même nombre, et il ne doit
 * exister qu'une fois. `deposer.ts` et `deposer-sans-compte.ts` importent
 * Prisma, donc les y laisser tirait le client de base de données dans le paquet
 * du navigateur — c'est exactement ce qui a fait recopier la borne à la main
 * dans le formulaire du produit, et une valeur en double est une valeur qui
 * finit par diverger.
 *
 * Le maximum d'un visiteur est la moitié de celui d'un compte. Il ne paie rien
 * et n'est identifié par rien ; ce qu'on lui offre est une démonstration, pas un
 * usage. Le minimum, lui, ne protège pas le budget : en dessous, il n'y a rien
 * à découper, et la démonstration tombe à plat.
 *
 * Ces bornes-ci ne protègent pas le budget non plus — c'est le quota en concepts
 * qui le fait, et mieux. Elles disent seulement ce qu'un seul geste peut porter.
 */

export const CARACTERES_MAXIMUM = 8000;
export const CARACTERES_MAXIMUM_ANONYME = 4000;
export const CARACTERES_MINIMUM_ANONYME = 40;

/**
 * Une longueur en signes, plus ce qu'elle représente en mots.
 *
 * « Textes plus longs » ne veut rien dire : pour un visiteur, ça peut être trois
 * mille comme quinze mille signes, et il n'a aucun moyen de savoir si son
 * article passe. Les deux nombres ensemble parce que personne ne compte les
 * caractères d'un texte, et que tout le monde sait ce que pèsent mille mots.
 *
 * Six signes et demi par mot, espace comprise : la moyenne du français courant.
 * Arrondi à la centaine, parce qu'annoncer « environ 1 231 mots » se contredit
 * tout seul.
 */
const SIGNES_PAR_MOT = 6.5;

export function longueurEnClair(caracteres: number): string {
  const mots = Math.round(caracteres / SIGNES_PAR_MOT / 100) * 100;

  return `${caracteres.toLocaleString("fr-FR")} caractères, environ ${mots.toLocaleString("fr-FR")} mots`;
}

/**
 * Ce qui cloche dans la longueur d'un essai, ou rien du tout.
 *
 * **L'écran a besoin du même verdict que le serveur, et avant lui.** Un champ
 * vide partait faire un aller-retour : le bouton passait en « Découpage en
 * cours… », l'attente s'affichait une demi-seconde, puis revenait dire ce que la
 * page savait déjà avant de partir. Le refus arrivait donc avec l'apparence d'un
 * traitement, sur le seul geste de la page qui convertit — et l'écran clignotait
 * pour rien.
 *
 * La règle vit ici, dans le module que le navigateur peut charger, et les deux
 * côtés l'appellent : le formulaire pour refuser sur place, le serveur pour
 * refuser vraiment. Recopiée, elle aurait deux libellés au bout de trois passes,
 * et c'est l'écran qui annoncerait autre chose que le refus.
 *
 * Le vide a son propre message. « Colle un peu plus de matière » devant un champ
 * où l'on n'a rien mis parle d'une quantité alors que le problème est une
 * absence.
 */
export const RIEN_A_DECOUPER =
  "Il n'y a rien à découper. Colle une phrase, un paragraphe, un article.";

export const TROP_COURT = "Colle un peu plus de matière : une phrase ou deux, au minimum.";

export function tropLong(): string {
  return `Ce texte dépasse ${longueurEnClair(CARACTERES_MAXIMUM_ANONYME)}. Crée un compte pour aller jusqu'à ${longueurEnClair(CARACTERES_MAXIMUM)}.`;
}

export function motifDeLongueur(texte: string): string | null {
  const propre = texte.trim();

  if (propre.length === 0) return RIEN_A_DECOUPER;
  if (propre.length < CARACTERES_MINIMUM_ANONYME) return TROP_COURT;
  if (propre.length > CARACTERES_MAXIMUM_ANONYME) return tropLong();

  return null;
}
