import { callAI } from "@/lib/ai/client";
import { AIInvalidOutputError } from "@/lib/ai/errors";
import type { AiMessage } from "@/lib/ai/message";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import {
  CONCEPTS_PAR_APPEL,
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
import type { DepotFige } from "./fige";

/**
 * Un passage du banc sur un dépôt : lecture d'image si c'en est une, découpage
 * en concepts, puis quatre questions par concept — trois concepts par appel.
 *
 * Un échec n'interrompt pas le passage : il est rangé avec le dépôt qui l'a
 * produit, accompagné de la sortie brute du modèle, et le groupe qui l'entoure
 * n'est pas perdu pour autant.
 *
 * Un concept marqué douteux ne part pas en génération. Il attend une décision
 * de l'utilisateur : lui écrire quatre questions, ce serait river une erreur.
 */

type Concept = ExtractAtomsOutput["atoms"][number];

export type Echec = { motif: string; brut?: string };

export type ConceptEvalue = {
  concept: Concept;
  manquements: Manquement[];
  variants: GenerateVariantsOutput["lots"][number]["variants"];
  manquementsVariants: Manquement[];
  echec?: Echec;
  /** Douteux : aucune question n'a été demandée pour ce concept. */
  misDeCote?: boolean;
};

export type DepotEvalue = {
  nom: string;
  texte: string;
  lecture?: { langue: string | null; exploitable: boolean };
  rejet: string | null;
  concepts: ConceptEvalue[];
  echec?: Echec;
};

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

/** Les concepts d'un envoi, numérotés : c'est ce rang que la sortie référence. */
function messageDuGroupe(groupe: Concept[]): AiMessage[] {
  const contenu = groupe
    .map((concept, index) => `Concept ${index + 1}.\n${concept.concept}`)
    .join("\n\n");

  return [{ role: "user", content: contenu }];
}

function grouper(concepts: Concept[]): Concept[][] {
  const groupes: Concept[][] = [];

  for (let debut = 0; debut < concepts.length; debut += CONCEPTS_PAR_APPEL) {
    groupes.push(concepts.slice(debut, debut + CONCEPTS_PAR_APPEL));
  }

  return groupes;
}

async function genererPourGroupe(groupe: Concept[]): Promise<ConceptEvalue[]> {
  const base = groupe.map((concept) => ({
    concept,
    manquements: controlerConcept(concept.concept),
  }));

  try {
    const { lots } = await callAI({
      contract: GENERATE_VARIANTS,
      system: SYSTEM_PROMPTS.generate_variants,
      messages: messageDuGroupe(groupe),
    });

    return base.map((entree, index) => {
      const lot = lots.find((candidat) => candidat.rang === index + 1);

      if (!lot) {
        return {
          ...entree,
          variants: [],
          manquementsVariants: [],
          echec: { motif: `aucun lot rendu pour le concept ${index + 1} de l'envoi` },
        };
      }

      return {
        ...entree,
        variants: lot.variants,
        manquementsVariants: controlerVariants(lot.variants),
      };
    });
  } catch (erreur) {
    const echec = decrire(erreur);

    return base.map((entree) => ({ ...entree, variants: [], manquementsVariants: [], echec }));
  }
}

async function evaluerConcepts(concepts: Concept[]): Promise<ConceptEvalue[]> {
  const douteux = concepts
    .filter((concept) => concept.uncertain)
    .map((concept) => ({
      concept,
      manquements: controlerConcept(concept.concept),
      variants: [],
      manquementsVariants: [],
      misDeCote: true,
    }));

  const evalues: ConceptEvalue[] = [];

  for (const groupe of grouper(concepts.filter((concept) => !concept.uncertain))) {
    evalues.push(...(await genererPourGroupe(groupe)));
  }

  return [...evalues, ...douteux];
}

/** Un dépôt du corpus : lecture éventuelle, extraction, puis questions. */
export async function evaluerDepot(depot: Depot): Promise<DepotEvalue> {
  const vide = { nom: depot.nom, texte: depot.texte, rejet: null, concepts: [] };

  try {
    const { texte, lecture } = await lireImage(depot);
    const extraction = await callAI({
      contract: EXTRACT_ATOMS,
      system: SYSTEM_PROMPTS.extract_atoms,
      messages: [{ role: "user", content: texte }],
    });

    return {
      ...vide,
      texte,
      lecture,
      rejet: extraction.rejected,
      concepts: await evaluerConcepts(extraction.atoms),
    };
  } catch (erreur) {
    return { ...vide, echec: decrire(erreur) };
  }
}

/** Un dépôt figé : on ne rappelle pas l'extraction, seules les questions bougent. */
export async function rejouerDepot(fige: DepotFige): Promise<DepotEvalue> {
  return {
    nom: fige.nom,
    texte: fige.texte,
    lecture: fige.lecture,
    rejet: fige.rejet,
    concepts: await evaluerConcepts(fige.concepts),
  };
}
