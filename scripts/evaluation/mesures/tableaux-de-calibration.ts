import { deciles } from "./geometrie";
import type { MesuresDuDepot } from "./signaux";

/**
 * Les deux tableaux du rapport de calibration : la distribution de chaque
 * signal, puis ce que chaque dépôt donne.
 *
 * Séparés du reste du rapport parce qu'ils répondent à une autre question. Les
 * listes triées servent à juger un cas ; ces tableaux-là servent à placer un
 * plancher et à voir, d'un passage au suivant, si une modification de prompt
 * améliore ou dégrade.
 */

function proximite(valeur: number): string {
  return valeur.toFixed(3);
}

function nombre(valeur: number): string {
  return valeur.toLocaleString("fr-FR");
}

function ouTiret(valeur: number | null): string {
  return valeur === null ? "—" : proximite(valeur);
}

/**
 * Les déciles de chaque signal, tous dépôts confondus.
 *
 * C'est la ligne qu'on lit pour poser un plancher. La médiane dit où se tient
 * le gros de la distribution ; un seuil, lui, se place dans la queue, et il
 * faut voir où elle commence pour ne pas la couper au hasard.
 *
 * Agréger des distances entre dépôts n'aurait aucun sens s'il s'agissait de les
 * comparer — c'est une distribution qu'on regarde ici, pas un classement.
 */
export function rendreLesDeciles(mesures: MesuresDuDepot[]): string[] {
  const series: [string, number[]][] = [
    ["Couverture (phrase → concept)", mesures.flatMap((m) => m.couverture.map((e) => e.proximite))],
    ["Soutien (concept → phrase)", mesures.flatMap((m) => m.soutien.map((e) => e.proximite))],
    ["Doublon (concept ↔ concept)", mesures.flatMap((m) => m.doublons.map((p) => p.proximite))],
    [
      "Radotage, même concept",
      mesures.flatMap((m) => (m.radotage?.intraLot ?? []).map((p) => p.proximite)),
    ],
    [
      "Radotage, concepts différents",
      mesures.flatMap((m) => (m.radotage?.interConcepts ?? []).map((p) => p.proximite)),
    ],
  ];

  const lignes = series.map(([nom, valeurs]) => {
    const bornes = deciles(valeurs);

    return `| ${nom} | ${nombre(valeurs.length)} | ${
      bornes.length === 0
        ? Array.from({ length: 11 }, () => "—").join(" | ")
        : bornes.map(proximite).join(" | ")
    } |`;
  });

  return [
    "## Où se tient chaque signal",
    "",
    "Les déciles, tous dépôts confondus. Un plancher se pose dans la queue de la distribution : c'est le premier décile qu'on regarde pour la couverture et le soutien, le dernier pour les doublons et le radotage.",
    "",
    `| Signal | Valeurs | ${Array.from({ length: 11 }, (_, d) => `d${d}`).join(" | ")} |`,
    `| --- | ---: | ${Array.from({ length: 11 }, () => "---:").join(" | ")} |`,
    ...lignes,
    "",
  ];
}

export function rendreLeTableau(mesures: MesuresDuDepot[]): string[] {
  const lignes = mesures.map((mesure) => {
    const pireCouverture = mesure.couverture[0];
    const pireSoutien = mesure.soutien[0];
    const plusProcheDoublon = mesure.doublons[0];

    return [
      `\`${mesure.nom}\``,
      nombre(mesure.segments),
      nombre(mesure.concepts),
      ouTiret(mesure.medianes.couverture),
      pireCouverture ? proximite(pireCouverture.proximite) : "—",
      ouTiret(mesure.medianes.soutien),
      pireSoutien ? proximite(pireSoutien.proximite) : "—",
      plusProcheDoublon ? proximite(plusProcheDoublon.proximite) : "—",
    ].join(" | ");
  });

  return [
    "## Ce que chaque dépôt donne",
    "",
    "Couverture : chaque phrase vers son concept le plus proche. Soutien : chaque concept vers sa phrase la plus proche. La colonne « pire » est le minimum du dépôt, celle des doublons son maximum.",
    "",
    "| Dépôt | Segments | Concepts | Couv. méd. | Couv. pire | Sout. méd. | Sout. pire | Doublon max |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...lignes.map((ligne) => `| ${ligne} |`),
    "",
  ];
}
