import { callAI } from "@/lib/ai/client";
import { AIInvalidOutputError } from "@/lib/ai/errors";
import type { AiMessage } from "@/lib/ai/message";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
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

export type Echec = {
  motif: string;
  brut?: string;
  /** Ce que le modèle avait rendu, tableau par tableau. Voir `compterLesElements`. */
  elements?: string;
};

/**
 * Combien d'éléments le modèle avait rendus dans chaque tableau de sa sortie.
 *
 * Quand une validation refuse pour dépassement, c'est exactement le nombre qu'on
 * cherche — c'est lui qui dit à quelle hauteur poser une borne. Il a fallu
 * l'estimer à la main sur `23-pave-maximal`, parce que le rapport tronquait la
 * sortie brute et ne le disait nulle part.
 *
 * Ne lit que le premier niveau : au-delà, on additionnerait des choux et des
 * carottes. Une sortie illisible le dit plutôt que de se taire.
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
 * Une question telle qu'elle sera servie, et le souvenir de l'ordre reçu.
 *
 * Le banc mesure ce que le produit montre : il fait donc passer les options par
 * la même remise en ordre que l'écriture d'un Variant. Sans ça il mesurerait la
 * sortie brute du modèle, et le contrôle de position ne verrait jamais la
 * correction qu'il est censé surveiller.
 *
 * `rangBrut` garde la position que le modèle avait donnée, pour que le rapport
 * puisse montrer les deux répartitions côte à côte — c'est l'écart entre elles
 * qui dit combien de travail fait le serveur.
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
  lecture?: { langue: string | null; exploitable: boolean };
  /** Absentes quand l'extraction a échoué : le modèle n'a rien rendu de lisible. */
  nature?: NatureDuDepot;
  langue?: string;
  rejet: string | null;
  concepts: ConceptEvalue[];
  echec?: Echec;
  /**
   * Ce que les deux coupes du serveur ont retiré à l'extraction. Absentes sur
   * un rejeu, qui repart d'un figé et ne rappelle pas l'extraction.
   */
  derives?: number;
  tronque?: boolean;
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

/**
 * L'envoi du groupe, construit par le même code que celui du produit.
 *
 * La graine est le texte du concept et non un identifiant, pour la raison dite
 * plus bas à propos des options : le banc n'écrit rien en base, et un concept
 * figé porte le même texte d'un passage à l'autre.
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
 * Les options remises dans l'ordre où elles seront montrées.
 *
 * La graine est le texte du concept, et non un identifiant : le banc n'écrit
 * rien en base, et un concept figé porte le même texte d'un passage à l'autre.
 * Deux rejeux se comparent donc question par question.
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

async function genererPourGroupe(groupe: Concept[]): Promise<ConceptEvalue[]> {
  const base = groupe.map((concept) => ({
    concept,
    manquements: controlerConcept(concept.concept),
  }));

  try {
    const { lots } = await callAI({
      // L'emplacement du trou est décidé par le serveur et imposé par la
      // grammaire de cet appel-là. La graine est celle du premier concept du
      // groupe : la contrainte vaut pour tout l'envoi.
      contract: contratDeGeneration(emplacementDuTexteATrou(groupe[0]?.concept ?? "")),
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

      const variants = servir(lot.variants, entree.concept.concept);

      return { ...entree, variants, manquementsVariants: controlerVariants(variants) };
    });
  } catch (erreur) {
    const echec = decrire(erreur);

    return base.map((entree) => ({ ...entree, variants: [], manquementsVariants: [], echec }));
  }
}

async function evaluerConcepts(
  concepts: Concept[],
  nature: NatureDuDepot | undefined,
): Promise<ConceptEvalue[]> {
  // La même règle que l'ingestion, et pas une copie : sur un dépôt de fiction,
  // le doute n'écarte plus rien, et le banc doit le voir comme le produit.
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

  for (const groupe of grouper(retenus)) {
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
      nature: extraction.nature,
      langue: extraction.langue,
      rejet: extraction.rejected,
      derives: extraction.derives,
      tronque: extraction.tronque,
      concepts: await evaluerConcepts(extraction.atoms, extraction.nature),
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
    nature: fige.nature,
    langue: fige.langue,
    rejet: fige.rejet,
    concepts: await evaluerConcepts(fige.concepts, fige.nature),
  };
}
