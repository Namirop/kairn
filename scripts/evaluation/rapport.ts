import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import type { ConsommationFenetre } from "@/lib/db/ai-call";
import { compter, rendreRepartition, type Passage } from "./rapport-chiffres";
import { rendreConcept, rendreEchec } from "./rapport-concept";

/**
 * Le rapport. Les contrôles automatiques disent où regarder ; le reste — est-ce
 * que la question est bonne — se juge à l'œil, donc le rapport est fait pour
 * être lu en entier.
 */

export type { Passage } from "./rapport-chiffres";

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
  const entree =
    consommation.inputTokens + consommation.cacheReadTokens + consommation.cacheCreationTokens;
  const cache =
    consommation.cacheReadTokens > 0
      ? ` (dont ${nombre(consommation.cacheReadTokens)} lus en cache)`
      : "";

  return [
    accorder(consommation.calls, "appel"),
    `${nombre(entree)} tokens d'entrée${cache}`,
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

  if (evaluation.echec) {
    return [...lignes, ...rendreEchec("Extraction en échec :", evaluation.echec)];
  }

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

function coutParConcept(passages: Passage[], total: ConsommationFenetre): string {
  const { aboutis } = compter(passages);
  const parConcept = aboutis === 0 ? 0 : Number(total.costUsd) / aboutis;
  const couts = passages.map((passage) => Number(passage.consommation.costUsd));
  const moyenne = couts.reduce((cumul, cout) => cumul + cout, 0) / (couts.length || 1);
  const pire = Math.max(...couts, 0);
  const coupable = passages.find((passage) => Number(passage.consommation.costUsd) === pire);

  return [
    `Par concept abouti : ${parConcept.toFixed(4)} $`,
    `par dépôt : ${moyenne.toFixed(4)} $ en moyenne, ${pire.toFixed(4)} $ au pire (${coupable?.evaluation.nom ?? "—"})`,
  ].join(" · ");
}

function appelsParDepot(passages: Passage[]): string {
  const appels = passages.map((passage) => passage.consommation.calls);
  const total = appels.reduce((cumul, valeur) => cumul + valeur, 0);

  return `Appels par dépôt : ${appels.join(", ")} — ${accorder(total, "appel")} en tout`;
}

function longueursDesPrompts(): string {
  return `Prompts : extraction ${SYSTEM_PROMPTS.extract_atoms.length} signes, questions ${SYSTEM_PROMPTS.generate_variants.length}, lecture ${SYSTEM_PROMPTS.ocr_extract.length}`;
}

export function rendreRapport(
  passages: Passage[],
  entete: { modele: string; emisA: Date; total: ConsommationFenetre; source: string },
): string {
  const horodatage = entete.emisA.toISOString().slice(0, 16).replace("T", " ");
  const { concepts, aboutis, misDeCote, generations, extractions, manquements } = compter(passages);

  return [
    `# Banc de génération — ${horodatage} UTC`,
    "",
    `\`${entete.modele}\` · ${entete.source} · ${accorder(passages.length, "dépôt")} · ${rendreConsommation(entete.total)}`,
    "",
    [
      accorder(concepts, "concept extrait", "concepts extraits"),
      accorder(aboutis, "lot abouti", "lots aboutis"),
      `${misDeCote} mis de côté`,
      accorder(generations, "génération en échec", "générations en échec"),
      accorder(extractions, "extraction en échec", "extractions en échec"),
      accorder(manquements, "manquement"),
    ].join(" · "),
    "",
    coutParConcept(passages, entete.total),
    "",
    appelsParDepot(passages),
    "",
    longueursDesPrompts(),
    "",
    ...rendreRepartition(passages),
    ...passages.flatMap((passage) => [...rendreDepot(passage), "---", ""]),
  ].join("\n");
}

/** Ce qu'on lit dans le terminal quand le passage est fini. */
export function resumeConsole(passages: Passage[]): string[] {
  return passages.map(({ evaluation, consommation }) => {
    const cout = dollars(consommation.costUsd);

    if (evaluation.echec) return `échec   ${evaluation.nom} — ${evaluation.echec.motif}`;
    if (evaluation.rejet) return `rejet   ${evaluation.nom} — aucun concept, motif rendu · ${cout}`;

    const { aboutis, misDeCote, generations, manquements } = compter([
      { evaluation, consommation },
    ]);
    const etat = manquements === 0 && generations === 0 ? "ok     " : "à voir ";
    const cotes = misDeCote > 0 ? `, ${misDeCote} mis de côté` : "";

    return `${etat} ${evaluation.nom} — ${accorder(aboutis, "lot")}${cotes}, ${generations} en échec, ${accorder(manquements, "manquement")} · ${cout}`;
  });
}
