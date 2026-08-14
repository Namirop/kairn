import { citeDuCode } from "@/lib/domain/controle-concept";
import { FACETTES_ATTENDUES, FORMATS_LIBRES, LIBRES_MAXIMUM } from "@/lib/domain/controle-variants";
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

const FORMATS = ["MCQ", "CLOZE", "TRUE_FALSE", "SHORT_ANSWER", "CODE", "EXPLAIN"] as const;

/** Les lots aboutis d'un passage : ni mis de côté, ni en échec. */
function lotsAboutis(passages: Passage[]) {
  return passages
    .flatMap((passage) => passage.evaluation.concepts)
    .filter((concept) => !concept.echec && !concept.misDeCote);
}

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
    "### Formats par facette",
    "",
    `| Facette | ${FORMATS.join(" | ")} |`,
    `| --- | ${FORMATS.map(() => "---").join(" | ")} |`,
    ...lignes,
    "",
    mesureDuTexteLibre(passages),
    "",
    mesureDuRappel(passages),
    "",
    mesureDuCode(passages),
    "",
  ];
}

/**
 * Le quota de texte libre, lot par lot.
 *
 * Le manquement s'affiche déjà sous le lot fautif, mais un rapport de huit
 * cents lignes ne se compte pas à la main : ce nombre-là est la réponse à
 * « est-ce que la contrainte a pris », et il se lit en tête.
 */
function mesureDuTexteLibre(passages: Passage[]): string {
  const lots = lotsAboutis(passages);
  const libres = lots.map(
    (concept) =>
      concept.variants.filter((variant) => FORMATS_LIBRES.includes(variant.format)).length,
  );
  const debordent = libres.filter((compte) => compte > LIBRES_MAXIMUM).length;
  const aucune = libres.filter((compte) => compte === 0).length;

  return `Texte libre : ${debordent} des ${lots.length} lots posent plus d'une question à s'auto-noter, ${aucune} n'en posent aucune.`;
}

/**
 * L'équilibre entre reconnaître et produire.
 *
 * Un QCM et un vrai ou faux montrent la réponse ; le texte à trou, le code et
 * le texte libre demandent de la produire. C'est le second geste qui consolide,
 * et c'est celui qui disparaît en premier quand le modèle se réfugie dans le
 * QCM. Ces deux nombres disent si un lot est devenu un questionnaire à cocher.
 */
function mesureDuRappel(passages: Passage[]): string {
  const lots = lotsAboutis(passages);
  const sansTrou = lots.filter(
    (concept) => !concept.variants.some((variant) => variant.format === "CLOZE"),
  );
  const aCocher = lots.filter(
    (concept) =>
      concept.variants.filter((variant) => ["MCQ", "TRUE_FALSE"].includes(variant.format)).length >
      2,
  );

  return `Rappel : ${sansTrou.length} des ${lots.length} lots ne portent aucun texte à trou, ${aCocher.length} posent plus de deux questions où la réponse est affichée.`;
}

/**
 * Trois nombres, pas un contrôle.
 *
 * La règle CODE se déclenche sur une citation dans le concept, ce qui est
 * observable — mais un déclencheur trop large remplacerait un verrou par un
 * autre. Le troisième nombre est celui qu'on surveille depuis que le corpus
 * n'est plus un corpus de développeur : une question de code posée sur un
 * concept qui n'en cite pas, c'est le réflexe technique qui revient tout seul.
 * Savoir si une question CODE éprouve quelque chose ou respecte une règle, ça
 * se juge à l'œil.
 */
function mesureDuCode(passages: Passage[]): string {
  const lots = lotsAboutis(passages);
  const porte = (concept: (typeof lots)[number]) =>
    concept.variants.some((variant) => variant.format === "CODE");
  const declenchent = lots.filter((concept) => citeDuCode(concept.concept.concept));
  const porteurs = declenchent.filter(porte);
  const indus = lots.filter((concept) => !citeDuCode(concept.concept.concept) && porte(concept));

  return [
    `CODE : ${declenchent.length} des ${lots.length} lots partent d'un concept qui cite du code, ${porteurs.length} en portent une question.`,
    `${indus.length} lots portent une question CODE sans que leur concept en cite : ${indus.map((concept) => concept.concept.tags.join("/")).join(", ") || "aucun"}.`,
  ].join(" ");
}
