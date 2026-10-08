import { createTranslator } from "next-intl";
import { depots } from "@/lib/i18n/messages/fr/depots";

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
 * Ce qu'une capture a le droit de peser au moment de partir, après réduction.
 *
 * Elle vivait dans le module qui lit les images, et ce module importe `sharp` :
 * l'écran ne pouvait donc pas la connaître, et laissait partir un fichier de
 * douze mégaoctets pour le voir refuser au retour. Depuis qu'un partage du
 * système peut joindre une capture sans que personne l'ait choisie dans un
 * sélecteur, ce détour n'est plus tenable — le refus doit se lire avant l'envoi,
 * comme celui de la longueur.
 *
 * **Elle passe de cinq mégaoctets à quatre le 13/09/2026, et ce n'est pas un
 * resserrage.** Cinq n'a jamais été atteignable : une fonction de l'hébergeur
 * refuse un corps de requête au-delà de quatre mégaoctets et demi, quoi qu'on
 * règle par ailleurs. Le produit annonçait donc une borne que le transport ne
 * tenait pas, et ce qui passait au-dessus tombait en panne au lieu d'être
 * refusé. Quatre laisse la place au texte et à l'enveloppe du formulaire.
 *
 * **Ce qu'on perd est nul en pratique.** Elle porte sur ce qui part, et ce qui
 * part est déjà réduit par le navigateur — `reduireLaCapture` ramène une
 * capture de téléphone de trois mégaoctets à quelques centaines de kilooctets.
 * Une photo de huit mégaoctets, qu'on refusait hier, passe donc aujourd'hui. La
 * borne ne se rencontre plus que si la réduction n'a pas pu se faire, et elle
 * est alors le dernier garde-fou avant une panne.
 */
export const TAILLE_MAXIMALE_OCTETS = 4 * 1024 * 1024;

/**
 * Le bord long au-delà duquel une capture est réduite.
 *
 * La mesure est celle du modèle : au-delà, chaque pixel coûte des jetons sans
 * rien apprendre de plus à la lecture. Elle est ici et non dans le module qui
 * lit les images, parce que depuis le 13/09/2026 les deux côtés réduisent — le
 * navigateur avant l'envoi, le serveur après réception — et qu'une mesure en
 * double est une mesure qui finit par diverger. Ce module-ci est le seul que
 * les deux peuvent charger : celui des images importe `sharp`.
 */
export const BORD_LONG_CAPTURE = 1568;

/**
 * Ce qu'une consigne jointe à un dépôt a le droit de faire de long.
 *
 * Trois cents signes, c'est deux phrases : « n'inclus pas la partie sur les
 * prix », « ignore la barre latérale, c'est une capture d'écran ». C'est
 * exactement l'usage — cadrer ce qu'il y a à retenir dans ce qu'on vient de
 * coller. Au-delà, ce n'est plus une consigne, c'est du contenu qui aurait dû
 * être déposé ; il entrerait en concurrence avec le texte au lieu de le
 * cadrer, et le prompt n'a aucun moyen d'arbitrer entre les deux.
 *
 * Le refus se lit avant l'envoi comme les autres bornes — la borne est ici, et
 * le champ compte dessus.
 */
export const CONSIGNE_MAXIMUM = 300;

/**
 * Les phrases des refus vivent dans l'espace de messages `depots.refus`, et se
 * disent dans la langue de l'écran. Ce module ne garde que les bornes et les
 * verdicts — ce que les deux côtés doivent calculer pareil. Les refus d'une
 * consigne trop longue, d'une image trop lourde et d'un texte plus long qu'un
 * dépôt y sont désormais : `consigneTropLongue`, `imageTropLourde`,
 * `texteTropLong`.
 */

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
 *
 * Le calcul seul : la phrase est `depots.refus.longueurEnClair`, qui reçoit les
 * deux nombres. La moyenne reste celle du français dans les deux langues — un
 * ordre de grandeur, pas une mesure, et un nombre de mots qui changerait avec la
 * langue de l'écran annoncerait deux bornes pour une.
 */
const SIGNES_PAR_MOT = 6.5;

export function motsEnviron(caracteres: number): number {
  return Math.round(caracteres / SIGNES_PAR_MOT / 100) * 100;
}

/**
 * Le français figé des refus, pour ce qui les lit encore hors de la zone du
 * dépôt — l'essai de la landing, le lecteur d'images. Il vient des mêmes
 * messages que la langue de l'écran : rien n'est écrit deux fois.
 */
const enFrancais = createTranslator({
  locale: "fr",
  messages: { depots },
  namespace: "depots.refus",
});

/**
 * @deprecated En français seulement. Hors de la zone du dépôt uniquement ;
 * ailleurs, `t("longueurEnClair", { caracteres, mots: motsEnviron(caracteres) })`.
 */
export function longueurEnClair(caracteres: number): string {
  return longueurEnClairAvec(enFrancais, caracteres);
}

/**
 * @deprecated En français seulement, pour `lib/images/capture.ts`. L'écran et le
 * dépôt disent `depots.refus.imageTropLourde` dans la langue de la personne.
 */
export const IMAGE_TROP_LOURDE = enFrancais("imageTropLourde");

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
 *
 * Le verdict est rendu neutre — `vide`, `court`, `long` — et chaque côté le dit
 * dans sa langue avec `depots.refus.essai`.
 */
export type DefautDeLongueur = "vide" | "court" | "long";

export function defautDeLongueur(texte: string): DefautDeLongueur | null {
  const propre = texte.trim();

  if (propre.length === 0) return "vide";
  if (propre.length < CARACTERES_MINIMUM_ANONYME) return "court";
  if (propre.length > CARACTERES_MAXIMUM_ANONYME) return "long";

  return null;
}

/**
 * Le refus de longueur d'un essai, et la seule chose importante qu'il ait à
 * dire : **ce n'est pas la limite du produit.**
 *
 * Quatre mille signes est la borne d'une démonstration, pas celle d'un dépôt.
 * Qui la rencontre sans qu'on le lui dise en conclut que Kairn n'accepte pas les
 * textes longs, et referme l'onglet sur un produit qui accepte quatre fois plus
 * dès qu'on a un compte. C'est le refus le plus coûteux de la page qui convertit,
 * et le nommer coûte une phrase.
 *
 * Le traducteur est celui de `depots.refus` : `getTranslations`, `useTranslations`
 * ou `textesDesRefus`, selon le côté.
 */
export function motifDeDefaut(defaut: DefautDeLongueur, t: TraduireLesRefus): string {
  if (defaut === "vide") return t("essai.rienADecouper");
  if (defaut === "court") return t("essai.tropCourt");

  return t("essai.tropLong", {
    limiteEssai: longueurEnClairAvec(t, CARACTERES_MAXIMUM_ANONYME),
    limiteCompte: longueurEnClairAvec(t, CARACTERES_MAXIMUM),
  });
}

/** `longueurEnClair`, dite par le traducteur reçu. */
export function longueurEnClairAvec(t: TraduireLesRefus, caracteres: number): string {
  return t("longueurEnClair", { caracteres, mots: motsEnviron(caracteres) });
}

/** Le traducteur de `depots.refus`, quel que soit le côté qui l'a fabriqué. */
export type TraduireLesRefus = typeof enFrancais;

/** @deprecated En français seulement, pour l'essai de la landing. Voir `motifDeDefaut`. */
export const RIEN_A_DECOUPER = motifDeDefaut("vide", enFrancais);

/** @deprecated En français seulement, pour l'essai de la landing. Voir `motifDeDefaut`. */
export const TROP_COURT = motifDeDefaut("court", enFrancais);

/** @deprecated En français seulement, pour l'essai de la landing. Voir `motifDeDefaut`. */
export function tropLong(): string {
  return motifDeDefaut("long", enFrancais);
}

/** @deprecated En français seulement, pour l'essai de la landing. Voir `defautDeLongueur`. */
export function motifDeLongueur(texte: string): string | null {
  const defaut = defautDeLongueur(texte);

  return defaut ? motifDeDefaut(defaut, enFrancais) : null;
}
