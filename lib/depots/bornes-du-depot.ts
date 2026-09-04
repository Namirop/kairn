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
 * Le maximum d'un visiteur est le quart de celui d'un compte — la moitié
 * jusqu'au 04/09/2026, où le second a doublé sans que le premier bouge. Il ne
 * paie rien et n'est identifié par rien ; ce qu'on lui offre est une
 * démonstration, pas un usage, et sur la page qui convertit chaque seconde
 * d'attente se paie. Le minimum, lui, ne protège pas le budget : en dessous, il
 * n'y a rien à découper, et la démonstration tombe à plat.
 *
 * Ces bornes-ci ne protègent pas le budget non plus — c'est le quota en concepts
 * qui le fait, et mieux. Elles disent seulement ce qu'un seul geste peut porter.
 */

/**
 * Ce qu'un compte peut coller d'un coup, et pourquoi c'est seize mille.
 *
 * **Ce n'est ni les jetons ni l'argent qui bornent.** Mesuré sur la production :
 * l'extraction la plus grosse a rendu 2 991 jetons de sortie sur les 10 000
 * autorisés, et un dépôt complet coûte 0,004 $. Les deux plafonds évidents sont
 * hors de portée.
 *
 * **C'est la latence, et elle suit le nombre de concepts.** Le dépôt de 7 431
 * signes a mis 24,9 secondes à se découper, contre 8,5 de moyenne. Doubler le
 * texte double les concepts rendus, donc la sortie, donc l'attente : une
 * cinquantaine de secondes. L'écran d'attente renonce à quatre-vingt-dix, et
 * au-delà de seize mille signes on tape le mur de la patience bien avant celui
 * de la technique.
 *
 * **Le chiffre s'accorde avec le plafond de concepts, et ce n'est pas un
 * hasard.** À la densité mesurée — 338 signes par concept —, seize mille signes
 * rendent environ quarante-sept concepts, juste sous les cinquante que
 * `PLAFOND_CONCEPTS_PAR_DEPOT` autorise. Les deux bornes racontent donc la même
 * chose : un dépôt, c'est un chapitre de cours, environ deux mille cinq cents
 * mots, et le mois complet d'un compte gratuit. Elles se changent ensemble.
 *
 * Ce qui a motivé la montée : quelqu'un qui colle un cours ne doit pas savoir
 * d'avance qu'il devra déposer dix fois. Huit mille signes coupaient une fiche en
 * plein milieu, et un dépôt qui commence au milieu d'un paragraphe donne des
 * concepts privés de leur contexte.
 */
export const CARACTERES_MAXIMUM = 16000;

/**
 * Ce qu'un visiteur peut coller, et il n'a pas bougé.
 *
 * La moitié de l'ancien plafond des comptes, le quart du nouveau. Sur la page qui
 * convertit, les secondes se paient : un visiteur n'a rien investi, il regarde un
 * écran d'attente et il part. Quatre mille signes se découpent en une dizaine de
 * secondes, et c'est la bonne longueur pour une démonstration — pas pour un
 * usage.
 */
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
