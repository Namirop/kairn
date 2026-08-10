import { callAI } from "@/lib/ai/client";
import { AIInvalidOutputError } from "@/lib/ai/errors";
import type { AiMessage } from "@/lib/ai/message";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import {
  EXTRACT_ATOMS,
  GENERATE_VARIANTS,
  OCR_EXTRACT,
  type ExtractAtomsOutput,
  type GenerateVariantsOutput,
} from "@/lib/ai/schemas";
import {
  controlerConcept,
  controlerVariants,
  type Manquement,
} from "@/lib/domain/controle-generation";
import type { Depot } from "./corpus";

/**
 * Un passage du banc sur un dépôt : lecture d'image si c'en est une, découpage
 * en concepts, puis quatre questions par concept.
 *
 * Un échec n'interrompt pas le passage — il est rangé avec le dépôt qui l'a
 * produit, accompagné de la sortie brute du modèle. Un banc qui s'arrête au
 * premier raté ne dit rien du reste du corpus ; un banc qui jette la sortie
 * fautive oblige à redépenser pour comprendre.
 */

export type Echec = { motif: string; brut?: string };

export type ConceptEvalue = {
  concept: ExtractAtomsOutput["atoms"][number];
  manquements: Manquement[];
  variants: GenerateVariantsOutput["variants"];
  manquementsVariants: Manquement[];
  echec?: Echec;
};

export type DepotEvalue = {
  nom: string;
  texte: string;
  lecture?: { langue: string | null; exploitable: boolean };
  rejet: string | null;
  concepts: ConceptEvalue[];
  echec?: Echec;
};

function messageTexte(texte: string): AiMessage[] {
  return [{ role: "user", content: texte }];
}

function decrire(erreur: unknown): Echec {
  if (erreur instanceof AIInvalidOutputError) {
    return { motif: erreur.message, brut: erreur.raw };
  }

  return { motif: erreur instanceof Error ? erreur.message : String(erreur) };
}

async function lireImage(
  depot: Depot,
): Promise<{ texte: string; lecture: DepotEvalue["lecture"] }> {
  if (!depot.image) return { texte: depot.texte, lecture: undefined };

  const lu = await callAI({
    contract: OCR_EXTRACT,
    system: SYSTEM_PROMPTS.ocr_extract,
    messages: [
      {
        role: "user",
        content: [{ type: "image", mediaType: depot.image.mediaType, base64: depot.image.base64 }],
      },
    ],
  });

  return { texte: lu.extractedText, lecture: { langue: lu.language, exploitable: lu.usable } };
}

async function evaluerConcept(
  concept: ExtractAtomsOutput["atoms"][number],
): Promise<ConceptEvalue> {
  const base = { concept, manquements: controlerConcept(concept.concept) };

  try {
    const { variants } = await callAI({
      contract: GENERATE_VARIANTS,
      system: SYSTEM_PROMPTS.generate_variants,
      messages: messageTexte(concept.concept),
    });

    return { ...base, variants, manquementsVariants: controlerVariants(variants) };
  } catch (erreur) {
    return { ...base, variants: [], manquementsVariants: [], echec: decrire(erreur) };
  }
}

export async function evaluerDepot(depot: Depot): Promise<DepotEvalue> {
  const vide = { nom: depot.nom, texte: depot.texte, rejet: null, concepts: [] };

  try {
    const { texte, lecture } = await lireImage(depot);
    const extraction = await callAI({
      contract: EXTRACT_ATOMS,
      system: SYSTEM_PROMPTS.extract_atoms,
      messages: messageTexte(texte),
    });

    const concepts: ConceptEvalue[] = [];
    for (const concept of extraction.atoms) {
      concepts.push(await evaluerConcept(concept));
    }

    return { ...vide, texte, lecture, rejet: extraction.rejected, concepts };
  } catch (erreur) {
    return { ...vide, echec: decrire(erreur) };
  }
}
