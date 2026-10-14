import { z } from "zod";
import type { InputNature } from "@/lib/db/types";
import { compterLesDerives } from "@/lib/domain/concepts-derives";
import { NATURES_DE_DEPOT } from "@/lib/domain/nature-du-depot";
import { appliquerLePlafond } from "@/lib/domain/plafond-de-concepts";
import type { AiContract } from "./contract";

/**
 * Un Input découpé en concepts unitaires, ou rien du tout avec son motif.
 *
 * Les deux moitiés du contrat restent séparées :
 * - `extractAtomsForme` part au modèle. Ses bornes chiffrées sont des
 *   indications — `lib/ai/output-schema.ts` les verse en description, la
 *   grammaire ne les fait pas respecter.
 * - `extractAtomsValidation` relit la réponse et ne rejette sur aucun compte :
 *   un appel payé ne se perd pas parce que le modèle a rendu trop de concepts,
 *   on tronque (`lib/domain/plafond-de-concepts.ts`).
 */

const NATURES = NATURES_DE_DEPOT satisfies readonly InputNature[];

/**
 * La borne montrée au modèle pour le tableau des concepts.
 *
 * Large exprès : le plafond du produit s'applique à la relecture. Elle dit
 * seulement l'ordre de grandeur d'une sortie folle. Rien ne rejette dessus.
 */
const GARDE_FOU_CONCEPTS = 40;

/** Ce qu'on garde d'un concept, sans une seule borne qui puisse rejeter. */
const atomeLu = z.object({
  concept: z
    .string()
    .describe("Une à trois phrases, autoportantes, sans renvoi au texte d'origine."),
  tags: z
    .array(z.string())
    .min(1)
    .describe("Minuscules, sans accent ni espace. Elles regroupent, elles ne décrivent pas."),
  uncertain: z
    .boolean()
    .describe("Vrai si l'affirmation déposée paraît nettement fausse. Extraite telle quelle."),
  deriveDe: z
    .number()
    .int()
    .nullish()
    .describe(
      "L'indice, à partir de 1, du concept dont celui-ci est un exemple, une illustration ou une conséquence directe : renseigne-le si quelqu'un qui connaîtrait ce concept-là ne pourrait pas ignorer celui-ci. null s'il tient seul.",
    ),
});

/**
 * La sortie telle qu'on la relit.
 *
 * `minItems` à 0 ou 1 est le seul mot-clé de comptage que la grammaire tienne
 * vraiment : `tags` peut exiger une étiquette, aucune autre borne n'est ici.
 */
const sortieLue = z.object({
  nature: z
    .enum(NATURES)
    .describe(
      "FACTUEL si le dépôt prétend être vrai du monde, FICTION s'il décrit un univers ou un jeu, PERSONNEL s'il est vrai mais invérifiable de l'extérieur.",
    ),
  atoms: z
    .array(atomeLu)
    .describe("Autant que le contenu en porte. Vide si le dépôt ne donne aucun concept."),
  rejected: z
    .string()
    .nullish()
    .describe("Une phrase à la deuxième personne. À omettre dès qu'un concept est extrait."),
  retenu: z
    .string()
    .nullish()
    .describe("Le dépôt débarrassé de ce que la consigne écartait, recopié mot pour mot."),
});

/**
 * Ce qui part à l'API : la même forme, plus les bornes qui cadrent la sortie.
 *
 * Dérivée de la version lue : deux objets jumeaux finiraient par diverger, et
 * la validation s'en apercevrait après la dépense.
 */
export const extractAtomsForme = sortieLue.omit({ retenu: true }).extend({
  atoms: z
    .array(
      atomeLu.extend({
        concept: atomeLu.shape.concept.min(20).max(600),
        tags: z.array(z.string().min(2).max(24)).min(1).max(3),
      }),
    )
    .max(GARDE_FOU_CONCEPTS)
    .describe("Classés du plus important au moins important. Vide si le dépôt n'en donne aucun."),
  rejected: z
    .string()
    .min(1)
    .max(300)
    .nullish()
    .describe("Une phrase à la deuxième personne. À omettre dès qu'un concept est extrait."),
});

/** Trois étiquettes suffisent à regrouper ; au-delà, elles décrivent. */
const TAGS_MAXIMUM = 3;

// Le modèle omet une clé là où le schéma acceptait `null`. La base, elle, ne
// verra jamais d'`undefined`.
const extractAtomsValidation = sortieLue.transform((sortie) => {
  const { gardes, tronque } = appliquerLePlafond(sortie.atoms);

  return {
    nature: sortie.nature,
    // `deriveDe` ne survit pas à la relecture : c'est une mesure, pas une
    // donnée du produit (`lib/domain/concepts-derives.ts`).
    atoms: gardes.map((atome) => ({
      concept: atome.concept,
      tags: atome.tags.slice(0, TAGS_MAXIMUM),
      uncertain: atome.uncertain,
    })),
    // Le compte tranche : s'il reste des concepts, il n'y a pas de rejet, quoi
    // que le modèle ait écrit — sinon le désaccord jetterait l'extraction.
    rejected: gardes.length === 0 ? (sortie.rejected ?? null) : null,
    /**
     * Ce que la consigne a laissé du dépôt, brut : sa fidélité se vérifie dans
     * `texteRetenu`, qui seul a le dépôt d'origine sous la main.
     */
    retenu: sortie.retenu ?? null,
    /** Ce que le modèle avait rendu, avant le plafond. Pour le journal. */
    rendus: sortie.atoms.length,
    /** Combien se déclarent découler d'un voisin. Mesuré, jamais appliqué. */
    derives: compterLesDerives(sortie.atoms),
    tronque,
  };
});

export type ExtractAtomsOutput = z.infer<typeof extractAtomsValidation>;

/**
 * La forme demandée quand le dépôt porte une consigne, et seulement alors.
 *
 * Recopier la part gardée double la sortie de l'appel : montré à chaque
 * découpage, ce champ se paierait partout pour un cas sur vingt, et le modèle
 * le remplirait sans rien avoir à écarter. La consigne décide déjà de la forme
 * du message (`depotADecouper`).
 */
const formeAvecConsigne = extractAtomsForme.extend({
  retenu: z
    .string()
    .nullish()
    .describe(
      "Le dépôt recopié mot pour mot, débarrassé des seuls passages que la consigne écarte. À omettre si la consigne n'écarte aucun passage.",
    ),
});

/**
 * Le contrat du découpage, dans sa forme avec ou sans consigne.
 *
 * Même intention, donc même prompt système, même fixture et même `purpose` au
 * registre : seule la forme montrée au modèle change (comme
 * `contratDeGeneration`).
 */
export function contratDExtraction(avecConsigne: boolean): AiContract<ExtractAtomsOutput> {
  return {
    purpose: "extract_atoms",
    forme: avecConsigne ? formeAvecConsigne : extractAtomsForme,
    validation: extractAtomsValidation,
  };
}

export const EXTRACT_ATOMS: AiContract<ExtractAtomsOutput> = contratDExtraction(false);
