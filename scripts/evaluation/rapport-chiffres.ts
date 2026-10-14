import { citeDuCode } from "@/lib/domain/controle-concept";
import { FACETTES_ATTENDUES, FORMATS_LIBRES, LIBRES_MAXIMUM } from "@/lib/domain/controle-variants";
import type { ConsommationFenetre } from "@/lib/db/registre-des-appels";
import type { DepotEvalue } from "./execution";

/**
 * Les comptes de la ligne de tête, et la répartition des formats.
 *
 * Aboutis, mis de côté et échecs se comptent à part, et un échec d'extraction
 * n'est pas un échec de génération : « un manquement » quand les quatre
 * cinquièmes de la sortie manquent rassurerait à tort.
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
    reprises: passages.reduce((total, passage) => total + passage.evaluation.reprises, 0),
    manquements: aboutis.reduce(
      (total, concept) => total + concept.manquements.length + concept.manquementsVariants.length,
      0,
    ),
  };
}

/**
 * Les formats par facette : on y voit si une facette se fige sur un seul
 * format, et si `CODE` sort.
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
 * Le quota de texte libre, résumé en tête : le manquement sous chaque lot fautif
 * ne se compte pas à la main dans un long rapport.
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
 * L'équilibre entre reconnaître et produire. QCM et vrai ou faux montrent la
 * réponse ; trou, code et texte libre la font produire, et c'est ce geste qui
 * consolide — le premier à disparaître quand le modèle se réfugie dans le QCM.
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
 * Trois nombres, pas un contrôle : la pertinence d'une question `CODE` se juge
 * à l'œil. Le troisième est celui à surveiller — une question de code sur un
 * concept qui n'en cite pas, c'est le réflexe technique qui revient.
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
