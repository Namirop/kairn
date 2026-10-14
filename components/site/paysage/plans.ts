export type Plan = {
  /** Hauteur de la crête, en fraction de la hauteur du panneau. */
  crete: number;
  /** Profil de la crête, en unités de la vue 1200×1000. */
  appuis: number[];
  /** Part d'ombre de la terre, le reste est du papier. */
  sol: number;
  /** Part d'encre des pierres, le reste est du papier. */
  pierre: number;
  /** La teinte de l'arête : elle se fonce quand le plan se rapproche. */
  arete: string;
  /** Le préfixe des variables de pierre de ce plan. */
  pierres: string;
  /** Son retard à l'arrivée, en millisecondes. Le proche se pose en premier. */
  arrivee: number;
  cairns: { gauche: string; haut: string; pierres: number }[];
};

/**
 * Les deux plans, et la seule règle qui compte pour les placer : **ils vivent
 * tous les deux au-dessus du titre.**
 *
 * Ils étaient d'abord répartis de part et d'autre de lui, et deux défauts en
 * sortaient. Le haut du panneau restait vide sur près de la moitié de sa
 * hauteur — un blanc qui n'était pas un ciel, juste une zone où l'on avait
 * oublié de dessiner. Et la seconde ligne du titre est **évidée** : un cairn
 * posé derrière elle traverse les lettres, si bien que ni la pierre ni le mot
 * ne se lisaient. Les crêtes sont donc remontées au-dessus de la ligne de
 * titre, les cairns occupent la bande haute, et ce qui reste entre eux et le
 * sol est le terrain sur lequel la phrase se pose.
 *
 * **Le plan proche va d'un seul tenant de sa crête au bas du panneau.** Il
 * s'arrêtait à mi-course et laissait la place à une seconde teinte, celle du
 * sol d'ouverture : la butte se coupait donc en deux à une hauteur qu'aucune
 * arête ne justifiait, et l'œil cherchait le relief qui aurait dû aller avec.
 * Sa masse est maintenant l'ombre pleine, du haut de la butte jusqu'à la
 * jointure du panneau suivant — c'est le même terrain, il a donc la même
 * valeur.
 *
 * **Et elle ne porte rien d'autre que son arête.** On y a tracé des strates,
 * d'abord deux puis six : dans les deux cas la butte cessait d'être une masse
 * pour devenir un objet rayé. Ce qui donne sa matière au premier plan existe
 * déjà et n'a pas besoin d'être dessiné — c'est le grain, que chaque panneau
 * porte derrière son contenu, monté jusqu'à ce qu'il se sente sans se voir.
 *
 * La valeur descend donc de haut en bas en trois temps seulement : le ciel en
 * papier, une terre claire au lointain, la masse d'ombre au premier plan. Le
 * nombre de pierres baisse avec la distance — de loin, un empilement se lit à
 * sa masse et non à son compte —, et l'encre monte d'un plan à l'autre pour que
 * le lointain existe au lieu de s'effacer.
 *
 * Les crêtes sont franchement au-dessus de la ligne de titre, et pas seulement
 * au-dessus des lettres : à quelques points près, l'arête du plan médian venait
 * traverser « Tu lis beaucoup. » en son milieu — un trait qui coupe un mot se
 * lit comme une rayure, jamais comme un relief. Elles laissent maintenant la
 * hauteur d'un geste entre elles et le haut du titre.
 *
 * Le seul évitement horizontal restant est la colonne du cairn principal, à
 * droite : un empilement de fond planté juste derrière lui brouillerait la
 * seule chose que l'ouverture a à montrer.
 */
export const PLANS: Plan[] = [
  {
    crete: 0.79,
    appuis: [0, -18, 8, -26, 4, -14, 6],
    sol: 18,
    pierre: 26,
    arete: "var(--arete-loin)",
    pierres: "--pierre-loin",
    arrivee: 340,
    cairns: [
      { gauche: "4%", haut: "3.5%", pierres: 3 },
      { gauche: "15%", haut: "4.5%", pierres: 4 },
      { gauche: "25%", haut: "3%", pierres: 3 },
      { gauche: "36%", haut: "4%", pierres: 3 },
      { gauche: "47%", haut: "3.5%", pierres: 3 },
      { gauche: "58%", haut: "4.5%", pierres: 4 },
      { gauche: "71%", haut: "3%", pierres: 3 },
      { gauche: "86%", haut: "4%", pierres: 3 },
    ],
  },
  {
    crete: 0.68,
    appuis: [10, 22, -12, 16, -20, 10, -6],
    sol: 100,
    pierre: 46,
    arete: "var(--arete-proche)",
    pierres: "--pierre-proche",
    arrivee: 100,
    cairns: [
      { gauche: "8%", haut: "6%", pierres: 4 },
      { gauche: "20%", haut: "7.5%", pierres: 5 },
      { gauche: "33%", haut: "5.5%", pierres: 4 },
      { gauche: "45%", haut: "7%", pierres: 5 },
      { gauche: "56%", haut: "5%", pierres: 4 },
      { gauche: "91%", haut: "6.5%", pierres: 5 },
    ],
  },
];

/**
 * Les mêmes plans, redessinés pour un écran de trois cent quatre-vingt-dix.
 *
 * Trois choses changent, et aucune n'est une mise à l'échelle.
 *
 * **Un. Les crêtes descendent sous le titre.** Sur deux colonnes, le terrain
 * peut occuper la bande haute parce que le titre a la sienne à gauche. Sur une
 * colonne il n'y a plus de « à côté » : le titre prend le haut, et tout ce
 * qu'on dessine derrière lui passe dedans. Le paysage se range donc sous la
 * phrase, dans le tiers bas, là où la seule chose à traverser est le cairn de
 * l'ouverture — et le traverser, ici, c'est le planter.
 *
 * **Deux. Les crêtes ondulent trois fois moins souvent.** La vue fait mille
 * deux cents unités de large quelle que soit la fenêtre : sept appuis, c'est
 * une ondulation tous les cent soixante-dix pixels sur un écran de bureau, et
 * tous les cinquante-cinq sur un téléphone. La même courbe y devient une
 * dentelure. Quatre appuis rendent au relief sa longueur d'onde, et l'amplitude
 * monte un peu pour compenser ce que l'écrasement horizontal a rendu plus raide.
 *
 * **Trois. Six cairns au lieu de quatorze, et ils s'écartent du milieu.** De
 * bureau, le paysage évite la colonne de droite parce que le cairn principal y
 * est ; sur téléphone il est au centre, donc c'est le centre qui se libère. Ce
 * qui reste tient en deux groupes qui l'encadrent — un sentier qui passe
 * derrière lui, ce que quatorze silhouettes larges de six pixels n'auraient pas
 * su dire.
 */
export const PLANS_TELEPHONE: Plan[] = [
  {
    crete: 0.2,
    appuis: [0, -30, 12, -22],
    sol: 18,
    pierre: 26,
    arete: "var(--arete-loin)",
    pierres: "--pierre-loin",
    arrivee: 340,
    cairns: [
      { gauche: "4%", haut: "4.5%", pierres: 3 },
      { gauche: "17%", haut: "5.5%", pierres: 4 },
      { gauche: "78%", haut: "5%", pierres: 3 },
      { gauche: "91%", haut: "4.5%", pierres: 3 },
    ],
  },
  {
    crete: 0.115,
    appuis: [14, -18, 26, -10],
    sol: 100,
    pierre: 46,
    arete: "var(--arete-proche)",
    pierres: "--pierre-proche",
    arrivee: 100,
    cairns: [
      { gauche: "6%", haut: "7.5%", pierres: 4 },
      { gauche: "87%", haut: "7%", pierres: 5 },
    ],
  },
];
