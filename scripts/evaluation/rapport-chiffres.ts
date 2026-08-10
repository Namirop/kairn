import { citeDuCode, FACETTES_ATTENDUES } from "@/lib/domain/controle-generation";
import type { ConsommationFenetre } from "@/lib/db/ai-call";
import type { DepotEvalue } from "./execution";

/**
 * Ce que la ligne de tête doit compter séparément, et la répartition des
 * formats.
 *
 * Un banc qui annonce « un manquement » quand les quatre cinquièmes de la
 * sortie manquent rassure à tort : aboutis, mis de côté et échecs sont trois
 * catégories, et un échec d'extraction n'est pas un échec de génération.
 */

export type Passage = { evaluation: DepotEvalue; consommation: ConsommationFenetre };

const FORMATS = ["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "CODE", "EXPLAIN"] as const;

export function compter(passages: Passage[]) {
  const concepts = passages.flatMap((passage) => passage.evaluation.concepts);
  const misDeCote = concepts.filter((concept) => concept.misDeCote);
  const enEchec = concepts.filter((concept) => concept.echec);
  const aboutis = concepts.filter((concept) => !concept.echec && !concept.misDeCote);

  return {
    concepts: concepts.length,
    aboutis: aboutis.length,
    misDeCote: misDeCote.length,
    generations: enEchec.length,
    extractions: passages.filter((passage) => passage.evaluation.echec).length,
    manquements: aboutis.reduce(
      (total, concept) => total + concept.manquements.length + concept.manquementsVariants.length,
      0,
    ),
  };
}

/**
 * Le tableau qu'on regarde pour savoir si le verrou a sauté : jusqu'ici, une
 * facette appelait toujours le même format, et `CODE` ne sortait jamais.
 */
export function rendreRepartition(passages: Passage[]): string[] {
  const compte = new Map<string, number>();

  for (const passage of passages) {
    for (const concept of passage.evaluation.concepts) {
      for (const variant of concept.variants) {
        const cle = `${variant.facet}|${variant.format}`;
        compte.set(cle, (compte.get(cle) ?? 0) + 1);
      }
    }
  }

  const lignes = FACETTES_ATTENDUES.map((facette) => {
    const cellules = FORMATS.map((format) => compte.get(`${facette}|${format}`) ?? 0);

    return `| ${facette} | ${cellules.map((valeur) => (valeur === 0 ? "—" : valeur)).join(" | ")} |`;
  });

  return [
    "## Répartition des formats par facette",
    "",
    `| Facette | ${FORMATS.join(" | ")} |`,
    `| --- | ${FORMATS.map(() => "---").join(" | ")} |`,
    ...lignes,
    "",
    mesureDuCode(passages),
    "",
  ];
}

/**
 * Deux nombres, pas un contrôle.
 *
 * La règle CODE se déclenche désormais sur une citation dans le concept, ce qui
 * est observable — mais un déclencheur trop large remplacerait un verrou par un
 * autre. Ces deux nombres disent si c'est arrivé ; savoir si la question CODE
 * éprouve quelque chose ou respecte une règle, ça se juge à l'œil.
 */
function mesureDuCode(passages: Passage[]): string {
  const lots = passages
    .flatMap((passage) => passage.evaluation.concepts)
    .filter((concept) => !concept.echec && !concept.misDeCote);
  const declenchent = lots.filter((concept) => citeDuCode(concept.concept.concept));
  const porteurs = declenchent.filter((concept) =>
    concept.variants.some((variant) => variant.format === "CODE"),
  );

  return `CODE : ${declenchent.length} des ${lots.length} lots partent d'un concept qui cite du code, ${porteurs.length} en portent une question.`;
}
