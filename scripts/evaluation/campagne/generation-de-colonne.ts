import { CONCEPTS_PAR_APPEL } from "@/lib/ai/schemas";
import { conceptsAQuestionner } from "@/lib/domain/nature-du-depot";
import type { ConceptFige, CorpusFige } from "../fige";
import { BUDGET_SORTIE_CAMPAGNE } from "../openrouter/campagne";
import { genererVia } from "../openrouter/generation";
import type { ModeleOpenRouter } from "../openrouter/modeles";
import { ajouter, type FactureCumulee } from "./facture-cumulee";
import { motifCourt } from "./motif-court";
import { servirVariants, type VariantServi } from "./questions-servies";

/** L'étape de génération d'une colonne de la campagne 2 : questions par dépôt, en groupes. */

export type GenerationDeColonne = {
  variantsParDepot: Map<string, VariantServi[][]>;
  echecsParDepot: Map<string, number>;
  /** Le dépôt après lequel le garde-fou 2× a coupé, `null` si l'étape est allée au bout. */
  arretApres: string | null;
};

function grouper<T>(items: T[]): T[][] {
  const groupes: T[][] = [];
  for (let i = 0; i < items.length; i += CONCEPTS_PAR_APPEL) {
    groupes.push(items.slice(i, i + CONCEPTS_PAR_APPEL));
  }
  return groupes;
}

/** Rend le nombre d'échecs du groupe ; les variants servis vont dans `parConcept`. */
async function genererPourUnGroupe(
  finaliste: ModeleOpenRouter,
  nomDuDepot: string,
  groupe: ConceptFige[],
  parConcept: Map<string, VariantServi[]>,
  facture: FactureCumulee,
  loguer: (message: string) => void,
): Promise<number> {
  const envoi = groupe.map((c) => ({ graine: c.concept, concept: c.concept }));
  try {
    const { sortie, facture: appel } = await genererVia(finaliste, envoi, BUDGET_SORTIE_CAMPAGNE);
    ajouter(appel, facture);
    for (const lot of sortie.lots) {
      const rang = lot.rang - 1;
      const concept = groupe[rang];
      if (!concept) {
        loguer(
          `  ⚠ ${nomDuDepot} · lot au rang ${lot.rang} hors du groupe de ${groupe.length}, ignoré`,
        );
        continue;
      }
      parConcept.set(concept.concept, servirVariants(concept.concept, lot.variants));
    }
    // Un concept du groupe oublié par le modèle compte en échec.
    let echecs = 0;
    const rangsRendus = new Set(sortie.lots.map((l) => l.rang - 1));
    for (let i = 0; i < groupe.length; i++) if (!rangsRendus.has(i)) echecs += 1;
    return echecs;
  } catch (erreur) {
    loguer(`  ✗ ${nomDuDepot} · groupe de ${groupe.length} — ${motifCourt(erreur).slice(0, 200)}`);
    return groupe.length;
  }
}

async function genererPourUnDepot(
  finaliste: ModeleOpenRouter,
  nomDuDepot: string,
  questionnables: ConceptFige[],
  facture: FactureCumulee,
  loguer: (message: string) => void,
): Promise<{ variants: VariantServi[][]; echecs: number }> {
  const parConcept = new Map<string, VariantServi[]>();
  let echecs = 0;
  for (const groupe of grouper(questionnables)) {
    echecs += await genererPourUnGroupe(finaliste, nomDuDepot, groupe, parConcept, facture, loguer);
  }

  const parConceptOrdonne: VariantServi[][] = questionnables.map(
    (c) => parConcept.get(c.concept) ?? [],
  );
  loguer(
    `  ✓ ${nomDuDepot} — ${parConceptOrdonne.filter((v) => v.length > 0).length}/${questionnables.length} concepts questionnés, ${echecs} échec(s), cumul ${facture.usd.toFixed(4)} $`,
  );
  return { variants: parConceptOrdonne, echecs };
}

export async function genererLaColonne(
  finaliste: ModeleOpenRouter,
  fige: CorpusFige,
  coutGenerationEstime: number,
  facture: FactureCumulee,
  loguer: (message: string) => void,
): Promise<GenerationDeColonne> {
  const variantsParDepot = new Map<string, VariantServi[][]>();
  const echecsParDepot = new Map<string, number>();

  for (let rangDepot = 0; rangDepot < fige.depots.length; rangDepot++) {
    const depot = fige.depots[rangDepot]!;
    const questionnables = conceptsAQuestionner(depot.concepts, depot.nature);
    if (questionnables.length === 0) {
      variantsParDepot.set(depot.nom, []);
      echecsParDepot.set(depot.nom, 0);
      continue;
    }

    const { variants, echecs } = await genererPourUnDepot(
      finaliste,
      depot.nom,
      questionnables,
      facture,
      loguer,
    );
    variantsParDepot.set(depot.nom, variants);
    echecsParDepot.set(depot.nom, echecs);

    const dernier = rangDepot === fige.depots.length - 1;
    if (!dernier && facture.usd > 2 * coutGenerationEstime) {
      return { variantsParDepot, echecsParDepot, arretApres: depot.nom };
    }
  }

  return { variantsParDepot, echecsParDepot, arretApres: null };
}
