import { z } from "zod";
import type { InputNature } from "@/lib/db/types";
import { compterLesDerives } from "@/lib/domain/concepts-derives";
import { NATURES_DE_DEPOT } from "@/lib/domain/nature-du-depot";
import { appliquerLePlafond } from "@/lib/domain/plafond-de-concepts";
import type { AiContract } from "./contract";

/**
 * Un Input découpé en concepts unitaires, ou rien du tout avec son motif.
 *
 * Ce fichier tient les deux moitiés du contrat séparées pour de bon, et c'est
 * ici que ça compte le plus :
 *
 * - `extractAtomsForme` part au modèle. Ses bornes chiffrées sont des
 *   **indications** — `lib/ai/output-schema.ts` les verse en description, la
 *   grammaire ne les fait pas respecter. On les garde parce qu'elles cadrent la
 *   sortie, pas parce qu'elles la garantissent.
 * - `extractAtomsValidation` relit la réponse, et **ne rejette sur aucun
 *   compte**. Un appel déjà payé ne doit pas être perdu parce que le modèle a
 *   rendu vingt-cinq concepts au lieu de vingt : on tronque.
 *
 * C'est la leçon du banc du 14/08, où `.max(12)` a fait tomber un dépôt entier.
 * Voir `lib/domain/plafond-de-concepts.ts`.
 */

const NATURES = NATURES_DE_DEPOT satisfies readonly InputNature[];

/**
 * La borne montrée au modèle pour le tableau des concepts.
 *
 * Large exprès : elle n'annonce pas le plafond du produit, qui est appliqué à la
 * relecture. Elle dit seulement l'ordre de grandeur au-delà duquel une sortie
 * serait manifestement folle. Rien ne rejette dessus.
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
 * vraiment : `tags` peut donc exiger au moins une étiquette sans risque. Tout
 * le reste — maximums de tableau, longueurs de chaîne — est parti.
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
 * Elle se dérive de la version lue plutôt que de se réécrire à côté : deux
 * objets jumeaux finiraient par diverger d'un champ, et c'est la validation qui
 * s'en apercevrait la première, après la dépense.
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
    // donnée du produit. Voir `lib/domain/concepts-derives.ts` pour ce qu'il a
    // coûté quand il coupait.
    atoms: gardes.map((atome) => ({
      concept: atome.concept,
      tags: atome.tags.slice(0, TAGS_MAXIMUM),
      uncertain: atome.uncertain,
    })),
    // Un motif de rejet à côté de concepts extraits se contredisait, et ce
    // désaccord jetait l'extraction entière. Le compte tranche : s'il reste des
    // concepts, il n'y a pas de rejet, quoi que le modèle ait écrit.
    rejected: gardes.length === 0 ? (sortie.rejected ?? null) : null,
    /**
     * Ce que la consigne a laissé du dépôt, tel que le modèle l'a recopié.
     *
     * Brut ici, et vérifié ailleurs : c'est `texteRetenu` qui décide s'il est
     * fidèle, et lui seul a le dépôt d'origine sous la main pour le dire. Un
     * contrat ne peut pas valider une sortie contre une entrée qu'il ne voit
     * pas.
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
 * Le champ de plus coûte ce qu'il fait écrire : sur un dépôt de six mille
 * signes, recopier la part gardée double la sortie de l'appel. Le montrer à
 * chaque découpage ferait payer ce champ à tout le monde pour un cas sur vingt —
 * et inviterait le modèle à le remplir là où il n'a rien à écarter. La consigne
 * est déjà ce qui décide de la forme du **message** (voir `depotADecouper`) :
 * elle décide aussi de celle de la sortie.
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
 * Même intention, donc même prompt système, même fixture et même ligne de
 * registre : seule la forme montrée au modèle change. C'est le même geste que
 * `contratDeGeneration`, pour la même raison — une variante de sortie ne
 * justifie pas une seconde intention dans les comptes.
 */
export function contratDExtraction(avecConsigne: boolean): AiContract<ExtractAtomsOutput> {
  return {
    purpose: "extract_atoms",
    forme: avecConsigne ? formeAvecConsigne : extractAtomsForme,
    validation: extractAtomsValidation,
  };
}

export const EXTRACT_ATOMS: AiContract<ExtractAtomsOutput> = contratDExtraction(false);
