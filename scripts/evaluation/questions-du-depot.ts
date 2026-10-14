import { callAI } from "@/lib/ai/client";
import type { AiMessage } from "@/lib/ai/message";
import { promptsSysteme } from "@/lib/ai/prompts";
import { CONCEPTS_PAR_APPEL, contratDeGeneration } from "@/lib/ai/schemas";
import { controlerConcept } from "@/lib/domain/controle-concept";
import { controlerVariants } from "@/lib/domain/controle-variants";
import { emplacementDuTexteATrou } from "@/lib/domain/emplacement-du-trou";
import { messageDuGroupe as construireLEnvoi } from "@/lib/domain/envoi-de-questions";
import type { LangueDuProduit } from "@/lib/domain/langue-du-produit";
import { conceptsAQuestionner, type NatureDuDepot } from "@/lib/domain/nature-du-depot";
import { ordonnerLesOptions } from "@/lib/domain/ordre-des-options";
import { cibleDuVraiOuFaux } from "@/lib/domain/vrai-ou-faux";
import type { Concept, ConceptEvalue, VariantEvalue, VariantRendu } from "./depot-evalue";
import { decrire } from "./echec-d-appel";
import { avecUneReprise } from "./reprise-d-appel";

/**
 * Les questions d'un dépôt, par groupes de `CONCEPTS_PAR_APPEL`. Un groupe en
 * échec est rangé avec ses concepts, sans interrompre les suivants.
 */

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

export async function evaluerConcepts(
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
