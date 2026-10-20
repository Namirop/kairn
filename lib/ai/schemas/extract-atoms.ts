import { z } from "zod";
import type { InputNature } from "@/lib/db/types";
import { compterLesDerives } from "@/lib/domain/concepts-derives";
import { NATURES_DE_DEPOT } from "@/lib/domain/nature-du-depot";
import { appliquerLePlafond } from "@/lib/domain/plafond-de-concepts";
import type { ContratDeSortie } from "./contrat-de-sortie";

/**
 * Un Input découpé en concepts, ou rien avec son motif. `formeDExtraction` part
 * au modèle, ses bornes chiffrées n'y sont que des indications ;
 * `validationDExtraction` ne rejette sur aucun compte et tronque
 * (`lib/domain/plafond-de-concepts.ts`), un appel payé ne se perdant pas pour
 * trop de concepts.
 */

const NATURES = NATURES_DE_DEPOT satisfies readonly InputNature[];

/** Large exprès : le plafond du produit s'applique à la relecture. */
const GARDE_FOU_CONCEPTS = 40;

/** Aucune borne qui puisse rejeter. */
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

/** `minItems` à 0 ou 1 est le seul comptage que la grammaire tienne, d'où `tags`. */
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
 * Dérivée de la version lue : deux objets jumeaux divergeraient, et la
 * validation ne s'en apercevrait qu'après la dépense.
 */
export const formeDExtraction = sortieLue.omit({ retenu: true }).extend({
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

// Le modèle omet des clés que le schéma acceptait à `null` : rien n'arrive en
// base à `undefined`.
const validationDExtraction = sortieLue.transform((sortie) => {
  const { gardes, tronque } = appliquerLePlafond(sortie.atoms);

  return {
    nature: sortie.nature,
    // `deriveDe` est une mesure, pas une donnée du produit
    // (`lib/domain/concepts-derives.ts`).
    atoms: gardes.map((atome) => ({
      concept: atome.concept,
      tags: atome.tags.slice(0, TAGS_MAXIMUM),
      uncertain: atome.uncertain,
    })),
    // Le compte tranche : un désaccord avec `rejected` jetterait l'extraction.
    rejected: gardes.length === 0 ? (sortie.rejected ?? null) : null,
    /** Brut : sa fidélité se vérifie dans `texteRetenu`, qui a le dépôt d'origine. */
    retenu: sortie.retenu ?? null,
    /** Avant le plafond, pour le journal. */
    rendus: sortie.atoms.length,
    /** Mesuré, jamais appliqué. */
    derives: compterLesDerives(sortie.atoms),
    tronque,
  };
});

export type SortieDExtraction = z.infer<typeof validationDExtraction>;

/**
 * Seulement quand le dépôt porte une consigne : recopier la part gardée double
 * la sortie, ce champ se paierait partout pour un cas sur vingt, et le modèle le
 * remplirait sans rien avoir à écarter.
 */
const formeAvecConsigne = formeDExtraction.extend({
  retenu: z
    .string()
    .nullish()
    .describe(
      "Le dépôt recopié mot pour mot, débarrassé des seuls passages que la consigne écarte. À omettre si la consigne n'écarte aucun passage.",
    ),
});

/** Même prompt, même fixture, même `purpose` : seule la forme montrée change. */
export function contratDExtraction(avecConsigne: boolean): ContratDeSortie<SortieDExtraction> {
  return {
    purpose: "extract_atoms",
    forme: avecConsigne ? formeAvecConsigne : formeDExtraction,
    validation: validationDExtraction,
  };
}

export const CONTRAT_D_EXTRACTION: ContratDeSortie<SortieDExtraction> = contratDExtraction(false);
