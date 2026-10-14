import type { Passage } from "./rapport-chiffres";

/**
 * Les dépôts du corpus dont on connaît le bon compte de concepts.
 *
 * Ce sont des témoins, pas des seuils de qualité : des dépôts écrits pour qu'un
 * changement précis s'y voie, là où une comparaison à l'œil de tout le banc
 * tromperait. Un témoin hors de sa fourchette désigne le fichier à ouvrir.
 *
 * Tous portent sur `deriveDe` : le compte attendu est celui qui reste une fois
 * rattachés les concepts qui ne sont qu'exemple ou illustration d'un autre.
 */

export type Temoin = {
  /** Le début du nom du fichier, sans son extension. */
  nom: string;
  /** Les bornes du compte attendu, incluses. */
  attendu: [number, number];
  /** Ce qu'il éprouve, à lire quand il sort de sa fourchette. */
  pourquoi: string;
};

export const TEMOINS: readonly Temoin[] = [
  {
    nom: "07-capture-assistant",
    attendu: [2, 3],
    pourquoi: "une capture d'écran dont l'habillage ne porte aucun concept propre",
  },
  {
    nom: "09-fait-pratique",
    attendu: [5, 5],
    pourquoi: "un fait pratique et ses conséquences, qui n'ont pas d'existence séparée",
  },
  {
    nom: "15-redondance-interne",
    attendu: [2, 3],
    pourquoi: "la même idée dite trois fois avec trois vocabulaires",
  },
  {
    nom: "16-concepts-imbriques",
    attendu: [2, 2],
    pourquoi: "une règle et ses instances : qui connaît la règle ne peut pas ignorer l'instance",
  },
  {
    nom: "19-chiffres-et-dates",
    attendu: [3, 3],
    pourquoi: "des chiffres qui précisent un même mécanisme plutôt que d'en ouvrir d'autres",
  },
];

function verdict(rendus: number, [bas, haut]: [number, number]): string {
  if (rendus < bas) return "trop coupé";
  if (rendus > haut) return "pas assez coupé";

  return "dans la fourchette";
}

function fourchette([bas, haut]: [number, number]): string {
  return bas === haut ? `${bas}` : `${bas} à ${haut}`;
}

/** Le tableau des témoins, et ce qui a manqué à ceux qui sortent du cadre. */
export function rendreTemoins(passages: Passage[]): string[] {
  const lignes = TEMOINS.flatMap((temoin) => {
    const passage = passages.find(({ evaluation }) => evaluation.nom.startsWith(temoin.nom));

    if (!passage) return [];

    const rendus = passage.evaluation.concepts.length;

    return [{ temoin, rendus, verdict: verdict(rendus, temoin.attendu) }];
  });

  if (lignes.length === 0) return [];

  const hors = lignes.filter((ligne) => ligne.verdict !== "dans la fourchette");

  return [
    "## Témoins",
    "",
    "| Dépôt | Attendu | Rendu | |",
    "| --- | --- | --- | --- |",
    ...lignes.map(
      ({ temoin, rendus, verdict: etat }) =>
        `| ${temoin.nom} | ${fourchette(temoin.attendu)} | ${rendus} | ${etat} |`,
    ),
    "",
    ...hors.flatMap(({ temoin, rendus }) => [
      `> **Témoin — ${temoin.nom}** : ${rendus} concepts pour ${fourchette(temoin.attendu)}` +
        ` attendus. Il éprouve ${temoin.pourquoi}.`,
      "",
    ]),
  ];
}
