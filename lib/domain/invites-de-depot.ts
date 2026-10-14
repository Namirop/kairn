import type { LangueDuProduit } from "./langue-du-produit";

/**
 * Ce qu'on met dans le champ de dépôt quand il est vide.
 *
 * Des exemples volontairement disparates (cuisine, mot étranger, documentation)
 * disent par contraste qu'on peut déposer n'importe quoi, mieux qu'une
 * explication qu'on ne lit pas avant d'agir.
 *
 * Chaque langue a ses propres textes, pas une traduction : un exemple déposé
 * part vraiment au découpage, dans la langue de la personne. « Doch » reste dans
 * les deux, ni le français ni l'anglais n'ayant de mot pour ça.
 */

export type ExempleDeDepot = {
  /** Ce qui s'affiche sur le bouton : court, et de nature évidente. */
  etiquette: string;
  /** Ce qui remplit le champ. Du vrai contenu, pas un texte de démonstration. */
  texte: string;
};

/**
 * Les trois exemples du premier dépôt, de trois natures qui ne se recouvrent
 * pas : deux exemples techniques diraient « outil pour développeurs », cinq
 * feraient une liste à lire.
 *
 * Les trois étiquettes doivent tenir sur une ligne de 576 px sous le champ de
 * l'essai : une puce orpheline casse le contraste. Avant d'en allonger une,
 * vérifier qu'elles tiennent encore.
 */
const EXEMPLES_FR: readonly ExempleDeDepot[] = [
  {
    etiquette: "Une astuce de cuisine",
    texte:
      "Pour qu'une pâte à crêpes ne fasse pas de grumeaux, verser le lait froid en une fois sur la farine et fouetter depuis le centre. Le repos d'une heure n'a rien à voir avec les grumeaux : il détend le gluten, ce qui rend les crêpes souples plutôt que caoutchouteuses.",
  },
  {
    etiquette: "Un mot étranger",
    texte:
      "« Doch », en allemand, sert à contredire une phrase négative. À « Du kommst nicht mit? », on répond « Doch » pour dire « si, je viens ». Le français n'a que « si » pour ça, et l'anglais n'a rien.",
  },
  {
    etiquette: "Une ligne de documentation",
    texte:
      "Un index PostgreSQL sur `(a, b)` sert une requête qui filtre sur `a`, ou sur `a` et `b`. Il ne sert pas une requête qui ne filtre que sur `b` : l'ordre des colonnes d'un index composite décide de ce qu'il peut couvrir.",
  },
];

/**
 * Les textes d'invite du champ, tirés à chaque chargement. Chacun nomme une
 * matière différente ; aucun ne donne de consigne de forme.
 */
const INVITES_FR: readonly string[] = [
  "Colle ici ce que tu veux retenir. Une phrase, un article, une explication qu'on vient de te donner.",
  "Le passage d'une doc que tu viens de relire pour la troisième fois.",
  "Ce qu'un collègue vient de t'expliquer et que tu auras oublié vendredi.",
  "Une règle de grammaire d'une langue que tu apprends.",
  "La réponse d'une IA que tu as trouvée bonne, avant de fermer l'onglet.",
  "Un raccourci clavier que tu réapprends tous les mois.",
  "Le paragraphe d'un article qui t'a fait changer d'avis.",
  "Une commande que tu retapes toujours de travers.",
];

/** Les mêmes en anglais, sous la même contrainte d'une ligne de 576 px. */
const EXEMPLES_EN: readonly ExempleDeDepot[] = [
  {
    etiquette: "A cooking tip",
    texte:
      "To keep crêpe batter from going lumpy, pour all the cold milk onto the flour at once and whisk from the center outward. Resting the batter for an hour has nothing to do with lumps: it relaxes the gluten, which makes the crêpes supple rather than rubbery.",
  },
  {
    etiquette: "A foreign word",
    texte:
      "In German, “doch” contradicts a negative statement. To “Du kommst nicht mit?” (“You're not coming?”), you answer “Doch” to mean “yes, I am”. French has “si” for this; English has no word at all.",
  },
  {
    etiquette: "A line of docs",
    texte:
      "A PostgreSQL index on `(a, b)` serves a query that filters on `a`, or on `a` and `b`. It does not serve a query that filters on `b` alone: the column order of a composite index decides what it can cover.",
  },
];

const INVITES_EN: readonly string[] = [
  "Paste what you want to remember. A sentence, an article, something someone just explained to you.",
  "The part of the docs you just reread for the third time.",
  "What a colleague just explained, which you'll have forgotten by Friday.",
  "A grammar rule from a language you're learning.",
  "An AI answer you found good, before you close the tab.",
  "A keyboard shortcut you relearn every month.",
  "The paragraph of an article that changed your mind.",
  "A command you always mistype.",
];

export const EXEMPLES_DE_DEPOT: Record<LangueDuProduit, readonly ExempleDeDepot[]> = {
  FR: EXEMPLES_FR,
  EN: EXEMPLES_EN,
};

export const INVITES_DE_DEPOT: Record<LangueDuProduit, readonly string[]> = {
  FR: INVITES_FR,
  EN: INVITES_EN,
};

/**
 * Une invite, tirée d'un nombre entre 0 et 1. L'appelant tire côté serveur : un
 * tirage côté client casserait l'hydratation.
 */
export function inviteDeDepot(tirage: number, langue: LangueDuProduit): string {
  const invites = INVITES_DE_DEPOT[langue];
  const bornes = Math.min(Math.max(tirage, 0), 0.999999);
  const rang = Math.floor(bornes * invites.length);

  return invites[rang] ?? invites[0] ?? "";
}
