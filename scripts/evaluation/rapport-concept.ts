import type { Manquement } from "@/lib/domain/controle-generation";
import type { ConceptEvalue, Echec } from "./execution";

/** Le rendu d'un concept et de ses quatre questions, manquements compris. */

function rendreManquements(manquements: Manquement[]): string[] {
  if (manquements.length === 0) return [];

  return [...manquements.map((m) => `> **${m.regle}** — ${m.detail}`), ""];
}

/** Un échec montre ce que le modèle a rendu, pas seulement ce qu'on lui reproche. */
export function rendreEchec(titre: string, echec: Echec): string[] {
  const lignes = [`**${titre}** ${echec.motif}`, ""];

  if (!echec.brut) return lignes;

  return [...lignes, "Sortie brute reçue :", "", "```json", echec.brut, "```", ""];
}

function rendreVariant(
  variant: ConceptEvalue["variants"][number],
  rang: number,
  manquements: Manquement[],
): string[] {
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
        (option, index) =>
          `${index + 1}. ${option}${index === variant.correctIndex ? " *(attendue)*" : ""}`,
      ),
    );
  }

  // Le manquement s'affiche sous la question qu'il vise. Un compteur en tête
  // sans emplacement dans le corps oblige à le chercher.
  return [...lignes, "", ...rendreManquements(manquements.filter((m) => m.rang === rang))];
}

export function rendreConcept(evalue: ConceptEvalue, rang: number): string[] {
  const etiquettes = evalue.concept.tags.map((tag) => `\`${tag}\``).join(" ");
  const doute = evalue.concept.uncertain ? " · **douteux**" : "";
  const lignes = [
    `### ${rang + 1}. ${etiquettes}${doute}`,
    "",
    evalue.concept.concept,
    "",
    ...rendreManquements(evalue.manquements),
  ];

  if (evalue.misDeCote) {
    return [
      ...lignes,
      "Aucune question demandée : le concept est marqué douteux et attend une décision.",
      "",
    ];
  }

  if (evalue.echec) {
    return [...lignes, ...rendreEchec("Génération en échec :", evalue.echec)];
  }

  return [
    ...lignes,
    ...evalue.variants.flatMap((variant, index) =>
      rendreVariant(variant, index, evalue.manquementsVariants),
    ),
    // Ce qui vise le lot entier, et non une question : nombre, facettes, ordre,
    // diversité des formats.
    ...rendreManquements(evalue.manquementsVariants.filter((m) => m.rang === undefined)),
  ];
}
