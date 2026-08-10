import type { Manquement } from "@/lib/domain/controle-generation";
import type { ConceptEvalue, DepotEvalue } from "./execution";

/**
 * Le rapport. Les contrôles automatiques disent où regarder ; le reste — est-ce
 * que la question est bonne — se juge à l'œil, donc le rapport est fait pour
 * être lu en entier, pas pour être compté.
 */

export type Entete = {
  modele: string;
  appels: number;
  coutUsd: string;
  emisA: Date;
};

const EXTRAIT_MAX = 220;

function extrait(texte: string): string {
  const plat = texte.replace(/\s+/g, " ").trim();

  return plat.length > EXTRAIT_MAX ? `${plat.slice(0, EXTRAIT_MAX)}…` : plat;
}

function rendreManquements(manquements: Manquement[], decalage = ""): string[] {
  return manquements.map(
    (manquement) => `${decalage}- **${manquement.regle}** — ${manquement.detail}`,
  );
}

function rendreVariant(variant: ConceptEvalue["variants"][number]): string[] {
  const lignes = [
    `**${variant.facet} · ${variant.format}**`,
    "",
    `Q. ${variant.question}`,
    "",
    `R. ${variant.answerKey}`,
  ];

  if (variant.options) {
    lignes.push(
      "",
      ...variant.options.map(
        (option, rang) =>
          `${rang + 1}. ${option}${rang === variant.correctIndex ? " *(attendue)*" : ""}`,
      ),
    );
  }

  return [...lignes, ""];
}

function rendreConcept(evalue: ConceptEvalue, rang: number): string[] {
  const etiquettes = evalue.concept.tags.map((tag) => `\`${tag}\``).join(" ");
  const doute = evalue.concept.uncertain ? " · **douteux**" : "";
  const lignes = [`### ${rang + 1}. ${etiquettes}${doute}`, "", evalue.concept.concept, ""];

  if (evalue.manquements.length > 0) {
    lignes.push("Concept :", ...rendreManquements(evalue.manquements), "");
  }

  if (evalue.erreur) {
    lignes.push(`Génération en échec : ${evalue.erreur}`, "");
    return lignes;
  }

  lignes.push(...evalue.variants.flatMap(rendreVariant));

  if (evalue.manquementsVariants.length > 0) {
    lignes.push("Questions :", ...rendreManquements(evalue.manquementsVariants), "");
  }

  return lignes;
}

function rendreDepot(depot: DepotEvalue): string[] {
  const lignes = [`## ${depot.nom}`, "", `> ${extrait(depot.texte) || "(aucun texte lu)"}`, ""];

  if (depot.lecture) {
    const { langue, exploitable } = depot.lecture;
    lignes.push(
      exploitable ? `Capture lue en \`${langue}\`.` : "Capture jugée inexploitable, rien de lu.",
      "",
    );
  }

  if (depot.erreur) return [...lignes, `Extraction en échec : ${depot.erreur}`, ""];
  if (depot.rejet) return [...lignes, `Aucun concept. Motif rendu : « ${depot.rejet} »`, ""];

  const pluriel = depot.concepts.length > 1 ? "concepts" : "concept";

  return [
    ...lignes,
    `${depot.concepts.length} ${pluriel}.`,
    "",
    ...depot.concepts.flatMap(rendreConcept),
  ];
}

export function compterManquements(evaluations: DepotEvalue[]): number {
  return evaluations
    .flatMap((depot) => depot.concepts)
    .reduce(
      (total, concept) => total + concept.manquements.length + concept.manquementsVariants.length,
      0,
    );
}

function compterConcepts(evaluations: DepotEvalue[]): number {
  return evaluations.reduce((total, depot) => total + depot.concepts.length, 0);
}

export function rendreRapport(evaluations: DepotEvalue[], entete: Entete): string {
  const horodatage = entete.emisA.toISOString().slice(0, 16).replace("T", " ");
  const resume = [
    `\`${entete.modele}\``,
    `${entete.appels} appels`,
    `${entete.coutUsd} $`,
    `${evaluations.length} dépôts`,
    `${compterConcepts(evaluations)} concepts`,
    `${compterManquements(evaluations)} manquements`,
  ].join(" · ");

  return [
    `# Banc de génération — ${horodatage} UTC`,
    "",
    resume,
    "",
    ...evaluations.flatMap((depot) => [...rendreDepot(depot), "---", ""]),
  ].join("\n");
}

export function accorder(nombre: number, singulier: string, pluriel = `${singulier}s`): string {
  return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
}

/** Ce qu'on lit dans le terminal quand le passage est fini. */
export function resumeConsole(evaluations: DepotEvalue[]): string[] {
  return evaluations.map((depot) => {
    if (depot.erreur) return `échec   ${depot.nom} — ${depot.erreur}`;
    if (depot.rejet) return `rejet   ${depot.nom} — aucun concept, motif rendu`;

    const manquements = depot.concepts.reduce(
      (total, concept) => total + concept.manquements.length + concept.manquementsVariants.length,
      0,
    );
    const echecs = depot.concepts.filter((concept) => concept.erreur).length;
    const etat = manquements === 0 && echecs === 0 ? "ok     " : "à voir ";
    const compte = [
      accorder(depot.concepts.length, "concept"),
      accorder(manquements, "manquement"),
      accorder(echecs, "génération en échec", "générations en échec"),
    ];

    return `${etat} ${depot.nom} — ${compte.join(", ")}`;
  });
}
