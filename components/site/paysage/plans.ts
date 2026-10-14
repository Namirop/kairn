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
 * Les deux plans du bureau. Règle de placement : crêtes et cairns restent
 * au-dessus du titre, avec une marge. La seconde ligne du titre est évidée, et
 * un cairn ou une arête qui la traverse rend illisibles et le mot et la pierre.
 *
 * Le plan proche est une ombre pleine de sa crête au bas du panneau, sans
 * strate : sa matière vient du grain. Le nombre de pierres baisse avec la
 * distance, l'encre monte avec la proximité.
 *
 * La colonne de droite reste libre : c'est celle du cairn principal.
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
 * Les mêmes plans, redessinés pour un écran de 390 px (pas mis à l'échelle).
 *
 * - Les crêtes passent sous le titre : sur une colonne, le titre prend le haut.
 * - Quatre appuis au lieu de sept : la vue fait 1 200 unités quelle que soit la
 *   largeur, et sept appuis y deviennent une dentelure.
 * - Six cairns au lieu de quatorze, écartés du centre, où se tient le cairn
 *   principal sur téléphone.
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
