import { conceptsAQuestionner } from "@/lib/domain/nature-du-depot";
import type { CorpusFige, DepotFige } from "../fige";
import { plonger, type Passe } from "../mesures/embeddings";
import type { ModeleOpenRouter } from "../openrouter/modeles";
import type { FactureCumulee } from "./facture-cumulee";
import { jugerLaFideliteDuDepot } from "./fidelite-de-colonne";
import { genererLaColonne, type GenerationDeColonne } from "./generation-de-colonne";
import { mesurerLeDepotQuestions, type MesuresDuDepot } from "./mesures-questions";
import type { VariantServi } from "./questions-servies";

export { scoreReferenceSonnet } from "./reference-sonnet";

/**
 * Une colonne de la campagne 2 : génération de questions par un finaliste sur
 * les concepts du figé `11h58`, puis mesures internes et juge de fidélité
 * Haiku via OpenRouter.
 *
 * Le garde-fou de dérive 2× s'applique séparément à la génération et à la
 * fidélité, et coupe la colonne sans reprise automatique.
 */

export type ScoreDepotQuestions = {
  nom: string;
  conceptsQuestionnables: number;
  variantsRendus: number;
  groupesEchoues: number;
  mesures: MesuresDuDepot | null;
  fideliteKO: number;
  fideliteAbstenues: number;
  fideliteTotal: number;
};

export type Statut =
  | { code: "complete" }
  | { code: "arret-2x-generation"; nom: string; coutReel: number; coutEstime: number }
  | { code: "arret-2x-fidelite"; nom: string; coutReel: number; coutEstime: number };

export type ScoreDeColonneQuestions = {
  finaliste: ModeleOpenRouter;
  depots: ScoreDepotQuestions[];
  factureGeneration: FactureCumulee;
  factureFidelite: FactureCumulee;
  statut: Statut;
};

async function plongerLesQuestions(
  variantsParDepot: Map<string, VariantServi[][]>,
  loguer: (message: string) => void,
) {
  const textesQuestions = [...variantsParDepot.values()].flatMap((depot) =>
    depot.flatMap((variants) =>
      variants.map((v) => (v.format === "CLOZE" && v.cloze ? v.cloze.sentence : v.question)),
    ),
  );
  loguer(`  · plongée : ${textesQuestions.length} questions à faire vecteurs (doublons compris).`);
  const passe = await plonger(textesQuestions);
  loguer(`  · vecteurs : ${passe.calcules} calculés, ${passe.enCache} au cache.`);
  return passe;
}

/** Les mesures géo puis le juge de fidélité d'un dépôt. */
async function scorerLeDepot(
  depot: DepotFige,
  { variantsParDepot, echecsParDepot }: GenerationDeColonne,
  vecteur: Passe["vecteur"],
  factureFidelite: FactureCumulee,
  loguer: (message: string) => void,
): Promise<ScoreDepotQuestions> {
  const variantsParConcept = variantsParDepot.get(depot.nom) ?? [];
  const mesures =
    variantsParConcept.length === 0
      ? null
      : mesurerLeDepotQuestions(depot.nom, variantsParConcept, vecteur);
  const questionnables = conceptsAQuestionner(depot.concepts, depot.nature);
  const fidelite = await jugerLaFideliteDuDepot(
    depot.nom,
    questionnables,
    variantsParConcept,
    factureFidelite,
    loguer,
  );

  return {
    nom: depot.nom,
    conceptsQuestionnables: questionnables.length,
    variantsRendus: variantsParConcept.reduce((s, v) => s + v.length, 0),
    groupesEchoues: echecsParDepot.get(depot.nom) ?? 0,
    mesures,
    ...fidelite,
  };
}

/** Fait tourner une colonne et rend son score pour le rapport aveuglé. */
export async function passerParColonneQuestions(
  finaliste: ModeleOpenRouter,
  fige: CorpusFige,
  coutGenerationEstime: number,
  coutFideliteEstime: number,
  loguer: (message: string) => void,
): Promise<ScoreDeColonneQuestions> {
  const factureGeneration = { in: 0, out: 0, usd: 0, appels: 0 };
  const factureFidelite = { in: 0, out: 0, usd: 0, appels: 0 };

  const generation = await genererLaColonne(
    finaliste,
    fige,
    coutGenerationEstime,
    factureGeneration,
    loguer,
  );
  const { arretApres } = generation;
  if (arretApres !== null) {
    const info = {
      code: "arret-2x-generation" as const,
      nom: arretApres,
      coutReel: factureGeneration.usd,
      coutEstime: coutGenerationEstime,
    };
    loguer(
      `  ⨯ garde-fou dérive 2× génération après ${arretApres} — ${info.coutReel.toFixed(4)} $ contre ${info.coutEstime.toFixed(4)} $ estimés.`,
    );
    return { finaliste, depots: [], factureGeneration, factureFidelite, statut: info };
  }

  const passe = await plongerLesQuestions(generation.variantsParDepot, loguer);

  const scores: ScoreDepotQuestions[] = [];
  let statutFinal: Statut = { code: "complete" };
  for (let rangDepot = 0; rangDepot < fige.depots.length; rangDepot++) {
    const depot = fige.depots[rangDepot]!;
    scores.push(await scorerLeDepot(depot, generation, passe.vecteur, factureFidelite, loguer));

    const dernier = rangDepot === fige.depots.length - 1;
    if (!dernier && factureFidelite.usd > 2 * coutFideliteEstime) {
      statutFinal = {
        code: "arret-2x-fidelite",
        nom: depot.nom,
        coutReel: factureFidelite.usd,
        coutEstime: coutFideliteEstime,
      };
      loguer(
        `  ⨯ garde-fou dérive 2× fidélité après ${depot.nom} — ${statutFinal.coutReel.toFixed(4)} $ contre ${statutFinal.coutEstime.toFixed(4)} $ estimés.`,
      );
      break;
    }
  }

  return { finaliste, depots: scores, factureGeneration, factureFidelite, statut: statutFinal };
}
