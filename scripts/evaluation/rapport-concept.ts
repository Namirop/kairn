import type { Manquement } from "@/lib/domain/controle-generation";
import type { ConceptEvalue, Echec } from "./execution";

/** Le rendu d'un concept et de ses quatre questions, manquements compris. */

function rendreManquements(titre: string, manquements: Manquement[]): string[] {
  if (manquements.length === 0) return [];

  return [
    `${titre} :`,
    ...manquements.map((manquement) => `- **${manquement.regle}** — ${manquement.detail}`),
    "",
  ];
}

/** Un échec montre ce que le modèle a rendu, pas seulement ce qu'on lui reproche. */
export function rendreEchec(titre: string, echec: Echec): string[] {
  const lignes = [`**${titre}** ${echec.motif}`, ""];

  if (!echec.brut) return lignes;

  return [...lignes, "Sortie brute reçue :", "", "```json", echec.brut, "```", ""];
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

export function rendreConcept(evalue: ConceptEvalue, rang: number): string[] {
  const etiquettes = evalue.concept.tags.map((tag) => `\`${tag}\``).join(" ");
  const doute = evalue.concept.uncertain ? " · **douteux**" : "";
  const lignes = [
    `### ${rang + 1}. ${etiquettes}${doute}`,
    "",
    evalue.concept.concept,
    "",
    ...rendreManquements("Concept", evalue.manquements),
  ];

  if (evalue.echec) {
    return [...lignes, ...rendreEchec("Génération en échec :", evalue.echec)];
  }

  return [
    ...lignes,
    ...evalue.variants.flatMap(rendreVariant),
    ...rendreManquements("Questions", evalue.manquementsVariants),
  ];
}
