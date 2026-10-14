import { callAI } from "@/lib/ai/client";
import { AiError, AIInvalidOutputError } from "@/lib/ai/errors";
import type { AiMessage } from "@/lib/ai/message";
import { promptsSysteme, SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import {
  CONCEPTS_PAR_APPEL,
  contratDeGeneration,
  EXTRACT_ATOMS,
  OCR_EXTRACT,
  type ExtractAtomsOutput,
  type GenerateVariantsOutput,
} from "@/lib/ai/schemas";
import { controlerConcept } from "@/lib/domain/controle-concept";
import { controlerVariants } from "@/lib/domain/controle-variants";
import { emplacementDuTexteATrou } from "@/lib/domain/emplacement-du-trou";
import { messageDuGroupe as construireLEnvoi } from "@/lib/domain/envoi-de-questions";
import { conceptsAQuestionner, type NatureDuDepot } from "@/lib/domain/nature-du-depot";
import { ordonnerLesOptions } from "@/lib/domain/ordre-des-options";
import { cibleDuVraiOuFaux } from "@/lib/domain/vrai-ou-faux";
import type { Manquement } from "@/lib/domain/manquement";
import type { LangueDuProduit } from "@/lib/domain/langue-du-produit";
import { langueDuDepot, type Depot } from "./corpus";
import type { DepotFige } from "./fige";

/**
 * Un passage du banc sur un dépôt : lecture d'image, découpage, puis questions
 * par groupes de `CONCEPTS_PAR_APPEL`. Un échec est rangé avec son dépôt et sa
 * sortie brute, sans interrompre le passage.
 */

type Concept = ExtractAtomsOutput["atoms"][number];

export type Echec = {
  motif: string;
  brut?: string;
  /** Ce que le modèle avait rendu, tableau par tableau. Voir `compterLesElements`. */
  elements?: string;
};

/**
 * Combien d'éléments le modèle avait rendus dans chaque tableau de sa sortie :
 * quand la validation refuse pour dépassement, c'est le nombre qui dit où poser
 * la borne, et le rapport tronque la sortie brute. Premier niveau seulement.
 */
function compterLesElements(brut: string | undefined): string | undefined {
  if (brut === undefined) return undefined;

  try {
    const lu: unknown = JSON.parse(brut);

    if (typeof lu !== "object" || lu === null) return undefined;

    const tableaux = Object.entries(lu).filter(([, valeur]) => Array.isArray(valeur));

    if (tableaux.length === 0) return undefined;

    return tableaux.map(([nom, valeur]) => `${nom} : ${valeur.length}`).join(", ");
  } catch {
    return "sortie illisible, rien à compter";
  }
}

type VariantRendu = GenerateVariantsOutput["lots"][number]["variants"][number];

/**
 * Une question telle qu'elle sera servie : le banc mesure ce que le produit
 * montre, donc après la même remise en ordre des options qu'un Variant écrit.
 * `rangBrut` garde la position donnée par le modèle ; l'écart entre les deux
 * répartitions dit combien le serveur corrige.
 */
export type VariantEvalue = VariantRendu & {
  rangBrut: number | null;
  /** La valeur que l'envoi avait imposée, sur les vrai ou faux seulement. */
  cible: boolean | null;
};

export type ConceptEvalue = {
  concept: Concept;
  manquements: Manquement[];
  variants: VariantEvalue[];
  manquementsVariants: Manquement[];
  echec?: Echec;
  /** Douteux : aucune question n'a été demandée pour ce concept. */
  misDeCote?: boolean;
};

export type DepotEvalue = {
  nom: string;
  texte: string;
  /** La langue de la personne, donc celle qu'on attend en sortie. */
  langue: LangueDuProduit;
  lecture?: { langue: string | null; exploitable: boolean };
  /** Absentes quand l'extraction a échoué : le modèle n'a rien rendu de lisible. */
  nature?: NatureDuDepot;
  rejet: string | null;
  concepts: ConceptEvalue[];
  echec?: Echec;
  /**
   * Concepts déclarés dérivés d'un voisin (mesurés, jamais coupés) et coupe du
   * plafond. Absents sur un rejeu, qui ne rappelle pas l'extraction.
   */
  derives?: number;
  tronque?: boolean;
  /** Appels repris sur ce dépôt, lecture, extraction et générations confondues. */
  reprises: number;
};

function decrire(erreur: unknown): Echec {
  if (erreur instanceof AIInvalidOutputError) {
    return {
      motif: erreur.message,
      brut: erreur.raw,
      elements: compterLesElements(erreur.raw),
    };
  }

  return { motif: erreur instanceof Error ? erreur.message : String(erreur) };
}

/**
 * Une seule reprise par appel, exception assumée au « pas de retry » du produit
 * (voir `callAI`) : une panne isolée qui laisse un dépôt vide dans le figé coûte
 * plus cher qu'un second essai. Jamais sur ces codes-ci, qui échoueraient à
 * l'identique. Les reprises remontent au rapport pour ne pas passer inaperçues.
 */
const REPRISES_INAPPROPRIEES = new Set([
  "AI_QUOTA",
  "AI_USER_QUOTA",
  "AI_ANONYMOUS_QUOTA",
  "AI_DISABLED",
  "AI_SCHEMA",
  "AI_CONFIG",
  "AI_FIXTURE_MISSING",
]);

async function avecUneReprise<T>(
  action: () => Promise<T>,
): Promise<{ resultat: T; reprises: number }> {
  try {
    return { resultat: await action(), reprises: 0 };
  } catch (erreur) {
    if (erreur instanceof AiError && REPRISES_INAPPROPRIEES.has(erreur.code)) {
      throw erreur;
    }

    return { resultat: await action(), reprises: 1 };
  }
}

async function lireImage(
  depot: Depot,
): Promise<{ texte: string; lecture: DepotEvalue["lecture"]; reprises: number }> {
  if (!depot.image) return { texte: depot.texte, lecture: undefined, reprises: 0 };

  const { resultat: lu, reprises } = await avecUneReprise(() =>
    callAI({
      contract: OCR_EXTRACT,
      system: SYSTEM_PROMPTS.ocr_extract,
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

/**
 * L'envoi du groupe, construit par le code du produit. La graine est le texte
 * du concept (voir `servir`).
 */
function messageDuGroupe(groupe: Concept[]): AiMessage[] {
  const contenu = construireLEnvoi(
    groupe.map((entree) => ({ graine: entree.concept, concept: entree.concept })),
  );

  return [{ role: "user", content: contenu }];
}

function grouper(concepts: Concept[]): Concept[][] {
  const groupes: Concept[][] = [];

  for (let debut = 0; debut < concepts.length; debut += CONCEPTS_PAR_APPEL) {
    groupes.push(concepts.slice(debut, debut + CONCEPTS_PAR_APPEL));
  }

  return groupes;
}

/**
 * Les options remises dans l'ordre où elles seront montrées. La graine est le
 * texte du concept, pas un identifiant : le banc n'écrit rien en base, et un
 * concept figé garde son texte, donc deux rejeux se comparent question par
 * question.
 */
function servir(variants: VariantRendu[], concept: string): VariantEvalue[] {
  return variants.map((variant) => {
    const graine = `${concept}:${variant.facet}`;
    // La cible se sème sur le concept seul, sans la facette : l'envoi n'en
    // annonce qu'une, et n'importe laquelle des quatre questions peut la porter.
    const cible = variant.format === "TRUE_FALSE" ? cibleDuVraiOuFaux(concept) : null;

    if (variant.options === null || variant.correctIndex === null) {
      return { ...variant, rangBrut: null, cible };
    }

    const servi = ordonnerLesOptions(variant.options, variant.correctIndex, graine);

    return { ...variant, ...servi, rangBrut: variant.correctIndex, cible };
  });
}

async function genererPourGroupe(
  groupe: Concept[],
  langue: LangueDuProduit,
): Promise<{ evalues: ConceptEvalue[]; reprises: number }> {
  const base = groupe.map((concept) => ({
    concept,
    manquements: controlerConcept(concept.concept),
  }));

  try {
    const { resultat, reprises } = await avecUneReprise(() =>
      callAI({
        // L'emplacement du trou est imposé par la grammaire de l'appel, semé
        // sur le premier concept : la contrainte vaut pour tout l'envoi.
        contract: contratDeGeneration(emplacementDuTexteATrou(groupe[0]?.concept ?? "")),
        system: promptsSysteme(langue).generate_variants,
        messages: messageDuGroupe(groupe),
      }),
    );
    const { lots, ecartes } = resultat;

    const evalues = base.map((entree, index) => {
      const lot = lots.find((candidat) => candidat.rang === index + 1);

      if (!lot) {
        // Un lot écarté à la relecture n'est pas un lot non rendu : les
        // confondre masquerait ce que la relecture retire.
        const motif = ecartes.includes(index + 1)
          ? `lot écarté à la relecture : le concept ${index + 1} portait une question inexploitable`
          : `aucun lot rendu pour le concept ${index + 1} de l'envoi`;

        return { ...entree, variants: [], manquementsVariants: [], echec: { motif } };
      }

      const variants = servir(lot.variants, entree.concept.concept);

      return { ...entree, variants, manquementsVariants: controlerVariants(variants) };
    });

    return { evalues, reprises };
  } catch (erreur) {
    const echec = decrire(erreur);
    const evalues = base.map((entree) => ({
      ...entree,
      variants: [],
      manquementsVariants: [],
      echec,
    }));

    // Compté 1 qu'il y ait eu reprise ou que le code l'excluait.
    return { evalues, reprises: 1 };
  }
}

async function evaluerConcepts(
  concepts: Concept[],
  nature: NatureDuDepot | undefined,
  langue: LangueDuProduit,
): Promise<{ evalues: ConceptEvalue[]; reprises: number }> {
  // La règle de l'ingestion, pas une copie : un concept douteux ne part pas en
  // génération, sauf sur un dépôt de fiction.
  const retenus = conceptsAQuestionner(concepts, nature);
  const douteux = concepts
    .filter((concept) => !retenus.includes(concept))
    .map((concept) => ({
      concept,
      manquements: controlerConcept(concept.concept),
      variants: [],
      manquementsVariants: [],
      misDeCote: true,
    }));

  const evalues: ConceptEvalue[] = [];
  let reprises = 0;

  for (const groupe of grouper(retenus)) {
    const rendu = await genererPourGroupe(groupe, langue);
    evalues.push(...rendu.evalues);
    reprises += rendu.reprises;
  }

  return { evalues: [...evalues, ...douteux], reprises };
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

  try {
    const { texte, lecture, reprises: reprisesLecture } = await lireImage(depot);
    const { resultat: extraction, reprises: reprisesExtraction } = await avecUneReprise(() =>
      callAI({
        contract: EXTRACT_ATOMS,
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
    return { ...vide, echec: decrire(erreur), reprises: 1 };
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
