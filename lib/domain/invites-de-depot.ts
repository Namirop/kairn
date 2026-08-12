/**
 * Ce qu'on met dans le champ de dépôt quand il est vide.
 *
 * Le principe de Kairn n'est pas compliqué, mais il n'est pas devinable : la
 * première question de quelqu'un devant un champ vide est « qu'est-ce que je
 * suis censé mettre ? ». Une phrase d'explication au-dessus répond mal, parce
 * qu'on ne lit pas les explications avant d'agir.
 *
 * Le message passe donc par le **contraste** entre des exemples volontairement
 * disparates : une astuce de cuisine, un mot d'une langue étrangère, une ligne
 * de documentation. Aucun des trois n'a de rapport avec les autres, et c'est
 * exactement ce qu'on veut faire comprendre — on peut déposer n'importe quoi.
 * Personne ne lit ça comme une consigne, tout le monde l'absorbe.
 */

export type ExempleDeDepot = {
  /** Ce qui s'affiche sur le bouton : court, et de nature évidente. */
  etiquette: string;
  /** Ce qui remplit le champ. Du vrai contenu, pas un texte de démonstration. */
  texte: string;
};

/**
 * Les trois exemples du premier dépôt.
 *
 * Trois, et de trois natures qui ne se recouvrent pas. Deux exemples techniques
 * diraient « c'est un outil pour développeurs » ; cinq exemples feraient une
 * liste qu'on lit au lieu d'un choix qu'on fait.
 */
export const EXEMPLES_DE_DEPOT: readonly ExempleDeDepot[] = [
  {
    etiquette: "Une astuce de cuisine",
    texte:
      "Pour qu'une pâte à crêpes ne fasse pas de grumeaux, verser le lait froid en une fois sur la farine et fouetter depuis le centre. Le repos d'une heure n'a rien à voir avec les grumeaux : il détend le gluten, ce qui rend les crêpes souples plutôt que caoutchouteuses.",
  },
  {
    etiquette: "Un mot d'une autre langue",
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
 * Les textes d'invite du champ, tirés à chaque chargement.
 *
 * C'est le meilleur véhicule du message « on peut déposer n'importe quoi »,
 * parce qu'il est là au moment du geste et non dans un écran qu'on a traversé.
 * Chacun nomme une matière différente ; aucun ne donne de consigne de forme.
 */
export const INVITES_DE_DEPOT: readonly string[] = [
  "Colle ici ce que tu veux retenir. Une phrase, un article, une explication qu'on vient de te donner.",
  "Le passage d'une doc que tu viens de relire pour la troisième fois.",
  "Ce qu'un collègue vient de t'expliquer et que tu auras oublié vendredi.",
  "Une règle de grammaire d'une langue que tu apprends.",
  "La réponse d'une IA que tu as trouvée bonne, avant de fermer l'onglet.",
  "Un raccourci clavier que tu réapprends tous les mois.",
  "Le paragraphe d'un article qui t'a fait changer d'avis.",
  "Une commande que tu retapes toujours de travers.",
];

/**
 * Une invite, tirée d'un nombre entre 0 et 1.
 *
 * Le tirage est passé en paramètre plutôt que fait ici : c'est ce qui rend la
 * fonction pure, donc rejouable dans un test, et c'est aussi ce qui laisse
 * l'appelant tirer côté serveur — un tirage côté client ferait diverger le
 * rendu du serveur et casserait l'hydratation.
 */
export function inviteDeDepot(tirage: number): string {
  const bornes = Math.min(Math.max(tirage, 0), 0.999999);
  const rang = Math.floor(bornes * INVITES_DE_DEPOT.length);

  return INVITES_DE_DEPOT[rang] ?? INVITES_DE_DEPOT[0] ?? "";
}
