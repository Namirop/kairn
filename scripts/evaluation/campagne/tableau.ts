import { BANDEAU_DE_CAMPAGNE } from "../openrouter/campagne";
import { REFERENCE } from "../openrouter/modeles";
import type { ScoreDeColonne, ScoreDepot } from "./execution";

/**
 * Le rendu aveuglé du tableau de campagne : colonnes A à D pour les
 * challengers, Sonnet en référence (déjà payée, non rejouée). Aucun nom de
 * challenger dans le rapport ; la correspondance sort de ce même module, depuis
 * la même liste étiquetée, pour que l'ordre A/B/C/D soit le même des deux côtés.
 */

export type Etiquette = "A" | "B" | "C" | "D";

export type EtiqueteesAvecScore = {
  etiquette: Etiquette;
  score: ScoreDeColonne;
}[];

/** La référence Sonnet, comptée depuis le figé et ses verdicts : pas de facture. */
export type ReferenceSonnet = {
  depots: ScoreDepot[];
};

function totalDoublons(score: ScoreDeColonne | ReferenceSonnet): number {
  return score.depots.reduce((s, d) => s + d.doublonsConfirmes, 0);
}
function totalManques(score: ScoreDeColonne | ReferenceSonnet): number {
  return score.depots.reduce((s, d) => s + d.manquesConfirmes, 0);
}
function totalInventions(score: ScoreDeColonne | ReferenceSonnet): number {
  return score.depots.reduce((s, d) => s + d.inventionsConfirmees, 0);
}
function totalAttendus(score: ScoreDeColonne | ReferenceSonnet): {
  couverts: number;
  total: number;
} {
  return score.depots.reduce(
    (s, d) => ({
      couverts: s.couverts + d.attendusCouverts,
      total: s.total + d.attendusTotal,
    }),
    { couverts: 0, total: 0 },
  );
}
function totalConcepts(score: ScoreDeColonne | ReferenceSonnet): number {
  return score.depots.reduce((s, d) => s + d.nbConcepts, 0);
}
function totalRejets(score: ScoreDeColonne | ReferenceSonnet): number {
  return score.depots.filter((d) => d.rejet !== null).length;
}
function totalEchecs(score: ScoreDeColonne | ReferenceSonnet): number {
  return score.depots.filter((d) => d.echec !== null).length;
}

function ligneStatut(score: ScoreDeColonne): string {
  if (score.statut.code === "complete") return "complète";
  if (score.statut.code === "arret-2x-extraction") {
    return `**arrêt 2× extraction** après ${score.statut.nom} — ${score.statut.coutReel.toFixed(4)} $ contre ${score.statut.coutEstime.toFixed(4)} $ estimés`;
  }
  return `**arrêt 2× juges** après ${score.statut.nom} — ${score.statut.coutReel.toFixed(4)} $ contre ${score.statut.coutEstime.toFixed(4)} $ estimés`;
}

function ligneRecap(
  label: string,
  score: ScoreDeColonne | ReferenceSonnet,
  extraction: string,
  juges: string,
  total: string,
): string {
  const attendus = totalAttendus(score);
  return `| ${label.padEnd(6)} | ${totalConcepts(score).toString().padStart(8)} | ${totalRejets(score).toString().padStart(6)} | ${totalEchecs(score).toString().padStart(6)} | ${totalDoublons(score).toString().padStart(8)} | ${totalManques(score).toString().padStart(7)} | ${totalInventions(score).toString().padStart(10)} | ${attendus.couverts}/${attendus.total} | ${extraction.padStart(10)} | ${juges.padStart(8)} | ${total.padStart(8)} |`;
}

function ligneDetailDepot(
  nom: string,
  depotSonnet: ScoreDepot | undefined,
  cellules: (ScoreDepot | undefined)[],
): string {
  const celluleSonnet = formaterCellule(depotSonnet);
  const cellulesChallengers = cellules.map(formaterCellule);
  return `| ${nom.padEnd(30)} | ${celluleSonnet.padEnd(24)} | ${cellulesChallengers.map((c) => c.padEnd(24)).join(" | ")} |`;
}

function formaterCellule(depot: ScoreDepot | undefined): string {
  if (!depot) return "—";
  if (depot.echec) return `**échec**`;
  if (depot.rejet !== null) return `rejet`;
  const bits: string[] = [`${depot.nbConcepts}c`];
  if (depot.doublonsConfirmes > 0) bits.push(`${depot.doublonsConfirmes}D`);
  if (depot.manquesConfirmes > 0) bits.push(`${depot.manquesConfirmes}M`);
  if (depot.inventionsConfirmees > 0) bits.push(`${depot.inventionsConfirmees}I`);
  if (depot.attendusTotal > 0) bits.push(`${depot.attendusCouverts}/${depot.attendusTotal}A`);
  return bits.join(" ");
}

export function rendreLeTableauAveugle(
  reference: ReferenceSonnet,
  colonnes: EtiqueteesAvecScore,
  emisA: Date,
): string {
  const lignes: string[] = [];
  lignes.push(`# Campagne 1 — rapport aveuglé`);
  lignes.push("");
  lignes.push(`Émis le ${emisA.toISOString()}.`);
  lignes.push("");
  lignes.push(`> ${BANDEAU_DE_CAMPAGNE}`);
  lignes.push("");
  lignes.push(
    `Colonnes A à D : quatre challengers, ordre randomisé, correspondance dans un fichier séparé. Colonne Sonnet : la référence du figé \`2026-08-20-11h58\`, jamais rejouée à cette passe (arrêt 1 du 2026-08-21).`,
  );
  lignes.push("");

  // Récap
  lignes.push(`## Vue d'ensemble`);
  lignes.push("");
  lignes.push(
    `| Col.   | Concepts | Rejets | Échecs | Doublons | Manques | Inventions | Attendus | Extr. $   | Juges $  | Total $  |`,
  );
  lignes.push(
    `|:-------|---------:|-------:|-------:|---------:|--------:|-----------:|---------:|----------:|---------:|---------:|`,
  );
  lignes.push(ligneRecap(`${REFERENCE.nom}`, reference, "réf.", "réf.", "réf."));
  for (const { etiquette, score } of colonnes) {
    const extraction = score.factureExtraction.usd.toFixed(4);
    const juges = score.factureJuges.usd.toFixed(4);
    const total = (score.factureExtraction.usd + score.factureJuges.usd).toFixed(4);
    lignes.push(ligneRecap(etiquette, score, extraction, juges, total));
  }
  lignes.push("");

  // Statuts (garde-fou 2×)
  lignes.push(`## Statut par colonne`);
  lignes.push("");
  for (const { etiquette, score } of colonnes) {
    lignes.push(`- **${etiquette}** : ${ligneStatut(score)}`);
  }
  lignes.push("");

  // Détail par dépôt
  const enTete = [
    "Dépôt",
    `${REFERENCE.nom.padEnd(24)}`,
    ...colonnes.map((c) => c.etiquette.padEnd(24)),
  ];
  lignes.push(`## Détail par dépôt`);
  lignes.push("");
  lignes.push(
    `Format d'une cellule : \`Nc\` concepts, \`nD\` doublons confirmés, \`nM\` manques confirmés, \`nI\` inventions confirmées, \`x/yA\` attendus couverts. « rejet » quand le modèle a refusé, « échec » sur panne technique.`,
  );
  lignes.push("");
  lignes.push(`| ${enTete.map((e, i) => (i === 0 ? e.padEnd(30) : e.padEnd(24))).join(" | ")} |`);
  lignes.push(
    `|${"-".repeat(32)}|${enTete
      .slice(1)
      .map(() => "-".repeat(26))
      .join("|")}|`,
  );

  const nomsDepots = reference.depots.map((d) => d.nom).sort();
  for (const nom of nomsDepots) {
    const s = reference.depots.find((d) => d.nom === nom);
    const cs = colonnes.map((c) => c.score.depots.find((d) => d.nom === nom));
    lignes.push(ligneDetailDepot(nom, s, cs));
  }
  lignes.push("");

  return lignes.join("\n");
}

export function rendreLaCorrespondance(colonnes: EtiqueteesAvecScore, emisA: Date): string {
  const lignes: string[] = [];
  lignes.push(`# Correspondance étiquette → challenger — campagne 1`);
  lignes.push("");
  lignes.push(`Émis le ${emisA.toISOString()}.`);
  lignes.push("");
  lignes.push(
    `Ce fichier n'est **pas** ouvert à l'arrêt 2 : il fixe seulement l'étiquetage pour que la mesure puisse être reproduite. Le rapport aveuglé (\`campagne-1-<horodatage>.md\`) est le seul document qui doit être lu à ce stade.`,
  );
  lignes.push("");
  for (const { etiquette, score } of colonnes) {
    lignes.push(`- **${etiquette}** → ${score.challenger.nom} (\`${score.challenger.id}\`)`);
  }
  lignes.push("");
  return lignes.join("\n");
}
