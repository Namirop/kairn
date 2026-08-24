import { BANDEAU_DE_CAMPAGNE } from "../openrouter/campagne";
import { REFERENCE } from "../openrouter/modeles";
import type { ScoreDeColonneQuestions, ScoreDepotQuestions } from "./execution-questions";

/**
 * Rendu aveuglé A/B du rapport de campagne 2 — mêmes lignes que la campagne 1
 * (une par dépôt) mais mesures différentes : fidélité (juge Haiku), radotage
 * intra/inter (mesure géo), diversité des formats, cible vrai/faux respectée.
 *
 * L'appelant décide de l'étiquetage A/B et garde la correspondance en local.
 * Cette fois, elle **ne quitte pas le dépôt** : Fable ne la reçoit pas.
 */

const ETIQUETTES = ["A", "B"] as const;
export type Etiquette = (typeof ETIQUETTES)[number];

export type EtiqueteesAvecScore = {
  etiquette: Etiquette;
  score: ScoreDeColonneQuestions;
}[];

export type ReferenceSonnetQuestions = {
  depots: ScoreDepotQuestions[];
};

type Totaux = {
  concepts: number;
  variants: number;
  radotageIntra: number;
  radotageInter: number;
  formatsDivers: number;
  cibleTotal: number;
  cibleManquees: number;
  fideliteKO: number;
  fideliteAbstenues: number;
  fideliteTotal: number;
  groupesEchoues: number;
};

function totaliser(depots: ScoreDepotQuestions[]): Totaux {
  return depots.reduce<Totaux>(
    (t, d) => ({
      concepts: t.concepts + d.conceptsQuestionnables,
      variants: t.variants + d.variantsRendus,
      radotageIntra: t.radotageIntra + (d.mesures?.radotage.intra ?? 0),
      radotageInter: t.radotageInter + (d.mesures?.radotage.inter ?? 0),
      formatsDivers: t.formatsDivers + (d.mesures?.formats.conceptsAvec4FormatsDistincts ?? 0),
      cibleTotal: t.cibleTotal + (d.mesures?.cibleVraiFaux.total ?? 0),
      cibleManquees: t.cibleManquees + (d.mesures?.cibleVraiFaux.manquees ?? 0),
      fideliteKO: t.fideliteKO + d.fideliteKO,
      fideliteAbstenues: t.fideliteAbstenues + d.fideliteAbstenues,
      fideliteTotal: t.fideliteTotal + d.fideliteTotal,
      groupesEchoues: t.groupesEchoues + d.groupesEchoues,
    }),
    {
      concepts: 0,
      variants: 0,
      radotageIntra: 0,
      radotageInter: 0,
      formatsDivers: 0,
      cibleTotal: 0,
      cibleManquees: 0,
      fideliteKO: 0,
      fideliteAbstenues: 0,
      fideliteTotal: 0,
      groupesEchoues: 0,
    },
  );
}

function ligneStatut(score: ScoreDeColonneQuestions): string {
  if (score.statut.code === "complete") return "complète";
  if (score.statut.code === "arret-2x-generation") {
    return `**arrêt 2× génération** après ${score.statut.nom} — ${score.statut.coutReel.toFixed(4)} $ contre ${score.statut.coutEstime.toFixed(4)} $ estimés`;
  }
  return `**arrêt 2× fidélité** après ${score.statut.nom} — ${score.statut.coutReel.toFixed(4)} $ contre ${score.statut.coutEstime.toFixed(4)} $ estimés`;
}

function ligneRecap(
  label: string,
  totaux: Totaux,
  coutGeneration: string,
  coutFidelite: string,
  coutTotal: string,
): string {
  return `| ${label.padEnd(6)} | ${totaux.concepts.toString().padStart(3)} | ${totaux.variants.toString().padStart(3)} | ${totaux.groupesEchoues.toString().padStart(3)} | ${totaux.fideliteKO}/${totaux.fideliteTotal}${totaux.fideliteAbstenues > 0 ? ` (${totaux.fideliteAbstenues} abst.)` : ""} | ${totaux.radotageIntra}/${totaux.radotageInter} | ${totaux.formatsDivers}/${totaux.concepts} | ${totaux.cibleManquees}/${totaux.cibleTotal} | ${coutGeneration.padStart(8)} | ${coutFidelite.padStart(8)} | ${coutTotal.padStart(8)} |`;
}

function formaterCellule(depot: ScoreDepotQuestions | undefined): string {
  if (!depot) return "—";
  if (depot.conceptsQuestionnables === 0) return "rien à questionner";
  const bits: string[] = [`${depot.variantsRendus}v`];
  if (depot.groupesEchoues > 0) bits.push(`${depot.groupesEchoues}éc`);
  if (depot.fideliteKO > 0) bits.push(`f${depot.fideliteKO}/${depot.fideliteTotal}`);
  if (depot.mesures) {
    if (depot.mesures.radotage.intra > 0) bits.push(`rI${depot.mesures.radotage.intra}`);
    if (depot.mesures.radotage.inter > 0) bits.push(`rE${depot.mesures.radotage.inter}`);
    if (depot.mesures.cibleVraiFaux.manquees > 0) {
      bits.push(`c${depot.mesures.cibleVraiFaux.manquees}/${depot.mesures.cibleVraiFaux.total}`);
    }
  }
  return bits.join(" ");
}

export function rendreLeTableauAveugleQuestions(
  reference: ReferenceSonnetQuestions,
  colonnes: EtiqueteesAvecScore,
  emisA: Date,
): string {
  const lignes: string[] = [];
  const totauxRef = totaliser(reference.depots);
  lignes.push(`# Campagne 2 — rapport aveuglé`);
  lignes.push("");
  lignes.push(`Émis le ${emisA.toISOString()}.`);
  lignes.push("");
  lignes.push(`> ${BANDEAU_DE_CAMPAGNE}`);
  lignes.push("");
  lignes.push(`Colonnes A et B : deux finalistes désignés à l'arrêt 2 de la campagne 1 (Gemini 3.7 Flash et GPT-5.6 Luna, ordre randomisé). Correspondance conservée localement, non transmise. Colonne Sonnet : la référence du figé \`2026-08-20-11h58\`, fidélité lue depuis les verdicts existants (pas de rejeu).`);
  lignes.push("");

  lignes.push(`## Vue d'ensemble`);
  lignes.push("");
  lignes.push(`Légende : \`Concepts\` questionnables · \`Variants\` rendus · \`Éch.\` groupes en échec · \`Fidélité\` KO/total · \`Radotage\` intra/inter · \`Formats\` concepts avec 4 formats distincts / total · \`Cible V/F\` manquées/total`);
  lignes.push("");
  lignes.push(`| Col.   | Con. | Var. | Éch. | Fidélité | Rad. i/e | Formats | Cible V/F | Gén. $   | Fid. $   | Total $  |`);
  lignes.push(`|:-------|-----:|-----:|-----:|:---------|:---------|--------:|:----------|---------:|---------:|---------:|`);
  lignes.push(ligneRecap(REFERENCE.nom, totauxRef, "réf.", "réf.", "réf."));
  for (const { etiquette, score } of colonnes) {
    const totaux = totaliser(score.depots);
    const gen = score.factureGeneration.usd.toFixed(4);
    const fid = score.factureFidelite.usd.toFixed(4);
    const tot = (score.factureGeneration.usd + score.factureFidelite.usd).toFixed(4);
    lignes.push(ligneRecap(etiquette, totaux, gen, fid, tot));
  }
  lignes.push("");

  lignes.push(`## Statut par colonne`);
  lignes.push("");
  for (const { etiquette, score } of colonnes) {
    lignes.push(`- **${etiquette}** : ${ligneStatut(score)}`);
  }
  lignes.push("");

  lignes.push(`## Détail par dépôt`);
  lignes.push("");
  lignes.push(`Format d'une cellule : \`Nv\` variants rendus, \`Néc\` groupes échoués, \`fX/Y\` fidélité (KO/total), \`rIN\`/\`rEN\` radotage intra/inter, \`cX/Y\` cible V/F (manquées/total). Les mesures nulles sont omises pour lisibilité. « rien à questionner » quand le dépôt n'a que des rejets ou des uncertain.`);
  lignes.push("");
  const enTete = ["Dépôt", REFERENCE.nom.padEnd(20), ...colonnes.map((c) => c.etiquette.padEnd(20))];
  lignes.push(`| ${enTete.map((e, i) => (i === 0 ? e.padEnd(30) : e.padEnd(20))).join(" | ")} |`);
  lignes.push(`|${"-".repeat(32)}|${enTete.slice(1).map(() => "-".repeat(22)).join("|")}|`);

  const nomsDepots = reference.depots.map((d) => d.nom).sort();
  for (const nom of nomsDepots) {
    const s = reference.depots.find((d) => d.nom === nom);
    const cs = colonnes.map((c) => c.score.depots.find((d) => d.nom === nom));
    const cellRef = formaterCellule(s);
    const cellsChallengers = cs.map(formaterCellule);
    lignes.push(`| ${nom.padEnd(30)} | ${cellRef.padEnd(20)} | ${cellsChallengers.map((c) => c.padEnd(20)).join(" | ")} |`);
  }
  lignes.push("");

  return lignes.join("\n");
}

export function rendreLaCorrespondanceQuestions(
  colonnes: EtiqueteesAvecScore,
  emisA: Date,
): string {
  const lignes: string[] = [];
  lignes.push(`# Correspondance étiquette → finaliste — campagne 2`);
  lignes.push("");
  lignes.push(`Émis le ${emisA.toISOString()}.`);
  lignes.push("");
  lignes.push(`Fable a demandé que la correspondance **ne quitte pas le dépôt cette fois**. Ce fichier reste local, sert à la reproductibilité, et n'est pas envoyé à l'arrêt 3.`);
  lignes.push("");
  for (const { etiquette, score } of colonnes) {
    lignes.push(`- **${etiquette}** → ${score.finaliste.nom} (\`${score.finaliste.id}\`)`);
  }
  lignes.push("");
  return lignes.join("\n");
}
