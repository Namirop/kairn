import { callAI } from "@/lib/ai/client";
import { promptsSysteme, PROMPTS_SYSTEME_FR } from "@/lib/ai/prompts";
import { CONTRAT_D_EXTRACTION, CONTRAT_DE_LECTURE } from "@/lib/ai/schemas";
import { langueDuDepot, type Depot } from "./corpus";
import type { DepotEvalue } from "./depot-evalue";
import { decrire } from "./echec-d-appel";
import type { DepotFige } from "./fige";
import { evaluerConcepts } from "./questions-du-depot";
import { avecUneReprise } from "./reprise-d-appel";

export type { ConceptEvalue, DepotEvalue, Echec, VariantEvalue } from "./depot-evalue";

/**
 * Un passage du banc sur un dépôt : lecture d'image, découpage, puis questions
 * par groupes de `CONCEPTS_PAR_APPEL`. Un échec est rangé avec son dépôt et sa
 * sortie brute, sans interrompre le passage.
 */

async function lireImage(
  depot: Depot,
): Promise<{ texte: string; lecture: DepotEvalue["lecture"]; reprises: number }> {
  if (!depot.image) return { texte: depot.texte, lecture: undefined, reprises: 0 };

  const { resultat: lu, reprises } = await avecUneReprise(() =>
    callAI({
      contract: CONTRAT_DE_LECTURE,
      system: PROMPTS_SYSTEME_FR.ocr_extract,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", mediaType: depot.image!.mediaType, base64: depot.image!.base64 },
          ],
        },
      ],
    }),
  );

  return {
    texte: lu.extractedText,
    lecture: { langue: lu.language, exploitable: lu.usable },
    reprises,
  };
}

/** Un dépôt du corpus : lecture éventuelle, extraction, puis questions. */
export async function evaluerDepot(depot: Depot): Promise<DepotEvalue> {
  const langue = langueDuDepot(depot.nom);
  const vide = {
    nom: depot.nom,
    texte: depot.texte,
    langue,
    rejet: null,
    concepts: [],
    reprises: 0,
  };

  // Les reprises des étapes déjà passées, pour qu'un échec à l'extraction ne
  // perde pas celle de la lecture.
  let reprisesAvantEchec = 0;

  try {
    const { texte, lecture, reprises: reprisesLecture } = await lireImage(depot);
    reprisesAvantEchec += reprisesLecture;
    const { resultat: extraction, reprises: reprisesExtraction } = await avecUneReprise(() =>
      callAI({
        contract: CONTRAT_D_EXTRACTION,
        system: promptsSysteme(langue).extract_atoms,
        messages: [{ role: "user", content: texte }],
      }),
    );
    const { evalues, reprises: reprisesGeneration } = await evaluerConcepts(
      extraction.atoms,
      extraction.nature,
      langue,
    );

    return {
      ...vide,
      texte,
      lecture,
      nature: extraction.nature,
      rejet: extraction.rejected,
      derives: extraction.derives,
      tronque: extraction.tronque,
      concepts: evalues,
      reprises: reprisesLecture + reprisesExtraction + reprisesGeneration,
    };
  } catch (erreur) {
    // L'étape qui échoue compte 1, qu'il y ait eu reprise ou que le code
    // l'excluait : la règle de `genererPourGroupe`.
    return { ...vide, echec: decrire(erreur), reprises: reprisesAvantEchec + 1 };
  }
}

/** Un dépôt figé : on ne rappelle pas l'extraction, seules les questions bougent. */
export async function rejouerDepot(fige: DepotFige): Promise<DepotEvalue> {
  const langue = langueDuDepot(fige.nom);
  const { evalues, reprises } = await evaluerConcepts(fige.concepts, fige.nature, langue);

  return {
    nom: fige.nom,
    texte: fige.texte,
    langue,
    lecture: fige.lecture,
    nature: fige.nature,
    rejet: fige.rejet,
    concepts: evalues,
    reprises,
  };
}
