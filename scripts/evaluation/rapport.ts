import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import type { ConsommationFenetre } from "@/lib/db/ai-call";
import type { DepotEvalue } from "./execution";
import { rendreConcept, rendreEchec } from "./rapport-concept";

/**
 * Le rapport. Les contrôles automatiques disent où regarder ; le reste — est-ce
 * que la question est bonne — se juge à l'œil, donc le rapport est fait pour
 * être lu en entier.
 *
 * La ligne de tête compte séparément ce qui a abouti et ce qui a échoué : un
 * banc qui annonce « un manquement » quand les quatre cinquièmes de la sortie
 * manquent rassure à tort.
 */

export type Passage = { evaluation: DepotEvalue; consommation: ConsommationFenetre };

const EXTRAIT_MAX = 220;

function nombre(valeur: number): string {
  return valeur.toLocaleString("fr-FR");
}

function dollars(montant: string): string {
  return `${Number(montant).toFixed(4)} $`;
}

export function accorder(nombre: number, singulier: string, pluriel = `${singulier}s`): string {
  return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
}

function extrait(texte: string): string {
  const plat = texte.replace(/\s+/g, " ").trim();

  return plat.length > EXTRAIT_MAX ? `${plat.slice(0, EXTRAIT_MAX)}…` : plat;
}

function rendreConsommation(consommation: ConsommationFenetre): string {
  const cache =
    consommation.cacheReadTokens > 0
      ? ` (dont ${nombre(consommation.cacheReadTokens)} lus en cache)`
      : "";

  return [
    accorder(consommation.calls, "appel"),
    `${nombre(consommation.inputTokens + consommation.cacheReadTokens + consommation.cacheCreationTokens)} tokens d'entrée${cache}`,
    `${nombre(consommation.outputTokens)} en sortie`,
    dollars(consommation.costUsd),
  ].join(" · ");
}

function rendreDepot({ evaluation, consommation }: Passage): string[] {
  const lignes = [
    `## ${evaluation.nom}`,
    "",
    rendreConsommation(consommation),
    "",
    `> ${extrait(evaluation.texte) || "(aucun texte lu)"}`,
    "",
  ];

  if (evaluation.lecture) {
    const { langue, exploitable } = evaluation.lecture;
    lignes.push(
      exploitable ? `Capture lue en \`${langue}\`.` : "Capture jugée inexploitable, rien de lu.",
      "",
    );
  }

  if (evaluation.echec)
    return [...lignes, ...rendreEchec("Extraction en échec :", evaluation.echec)];
  if (evaluation.rejet) {
    return [...lignes, `Aucun concept. Motif rendu : « ${evaluation.rejet} »`, ""];
  }

  return [
    ...lignes,
    `${accorder(evaluation.concepts.length, "concept")}.`,
    "",
    ...evaluation.concepts.flatMap(rendreConcept),
  ];
}

/** Les quatre nombres de la ligne de tête, comptés séparément. */
export function compter(passages: Passage[]) {
  const concepts = passages.flatMap((passage) => passage.evaluation.concepts);
  const aboutis = concepts.filter((concept) => !concept.echec);

  return {
    concepts: concepts.length,
    aboutis: aboutis.length,
    echecs: concepts.length - aboutis.length + passages.filter((p) => p.evaluation.echec).length,
    manquements: aboutis.reduce(
      (total, concept) => total + concept.manquements.length + concept.manquementsVariants.length,
      0,
    ),
  };
}

function coutParDepot(passages: Passage[]): string {
  const couts = passages.map((passage) => Number(passage.consommation.costUsd));
  const moyenne = couts.reduce((total, cout) => total + cout, 0) / (couts.length || 1);
  const pire = Math.max(...couts, 0);
  const coupable = passages.find((passage) => Number(passage.consommation.costUsd) === pire);

  return `Par dépôt : ${moyenne.toFixed(4)} $ en moyenne, ${pire.toFixed(4)} $ au pire (${coupable?.evaluation.nom ?? "—"})`;
}

function longueursDesPrompts(): string {
  return `Prompts : extraction ${SYSTEM_PROMPTS.extract_atoms.length} signes, questions ${SYSTEM_PROMPTS.generate_variants.length}, lecture ${SYSTEM_PROMPTS.ocr_extract.length}`;
}

export function rendreRapport(
  passages: Passage[],
  entete: { modele: string; emisA: Date; total: ConsommationFenetre; source: string },
): string {
  const horodatage = entete.emisA.toISOString().slice(0, 16).replace("T", " ");
  const { concepts, aboutis, echecs, manquements } = compter(passages);

  return [
    `# Banc de génération — ${horodatage} UTC`,
    "",
    `\`${entete.modele}\` · ${entete.source} · ${accorder(passages.length, "dépôt")} · ${rendreConsommation(entete.total)}`,
    "",
    `${accorder(concepts, "concept extrait", "concepts extraits")} · ${accorder(aboutis, "lot abouti", "lots aboutis")} · ${accorder(echecs, "génération en échec", "générations en échec")} · ${accorder(manquements, "manquement")}`,
    "",
    coutParDepot(passages),
    "",
    longueursDesPrompts(),
    "",
    ...passages.flatMap((passage) => [...rendreDepot(passage), "---", ""]),
  ].join("\n");
}

/** Ce qu'on lit dans le terminal quand le passage est fini. */
export function resumeConsole(passages: Passage[]): string[] {
  return passages.map(({ evaluation, consommation }) => {
    const cout = dollars(consommation.costUsd);

    if (evaluation.echec) return `échec   ${evaluation.nom} — ${evaluation.echec.motif}`;
    if (evaluation.rejet) return `rejet   ${evaluation.nom} — aucun concept, motif rendu · ${cout}`;

    const manquements = evaluation.concepts.reduce(
      (total, concept) =>
        total +
        (concept.echec ? 0 : concept.manquements.length + concept.manquementsVariants.length),
      0,
    );
    const echecs = evaluation.concepts.filter((concept) => concept.echec).length;
    const etat = manquements === 0 && echecs === 0 ? "ok     " : "à voir ";

    return `${etat} ${evaluation.nom} — ${accorder(evaluation.concepts.length, "concept")}, ${echecs} en échec, ${accorder(manquements, "manquement")} · ${cout}`;
  });
}
