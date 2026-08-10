import { z } from "zod";
import type { AiContract } from "./contract";

/** Un Input découpé en concepts unitaires, ou rien du tout avec son motif. */
export const extractAtomsForme = z.object({
  atoms: z
    .array(
      z.object({
        concept: z
          .string()
          .min(20)
          .max(600)
          .describe("Une à trois phrases, autoportantes, sans renvoi au texte d'origine."),
        tags: z
          .array(z.string().min(2).max(24))
          .min(1)
          .max(3)
          .describe("Minuscules, sans accent ni espace. Elles regroupent, elles ne décrivent pas."),
        uncertain: z
          .boolean()
          .describe(
            "Vrai si l'affirmation déposée paraît nettement fausse. Extraite telle quelle.",
          ),
      }),
    )
    .max(12)
    .describe("Autant que le contenu en porte. Vide si le dépôt ne donne aucun concept."),
  rejected: z
    .string()
    .min(1)
    .max(300)
    .nullish()
    .describe("Une phrase à la deuxième personne. À omettre dès qu'un concept est extrait."),
});

const extractAtomsValidation = extractAtomsForme
  // Les deux champs se répondent : un rejet sans motif ne dit rien à
  // l'utilisateur, un motif à côté de concepts extraits se contredit.
  .refine((sortie) => (sortie.atoms.length === 0) === ((sortie.rejected ?? null) !== null), {
    error: "rejected doit être renseigné si et seulement si atoms est vide",
    path: ["rejected"],
  })
  // Le modèle omet une clé là où le schéma acceptait `null`. La base, elle, ne
  // verra jamais d'`undefined`.
  .transform((sortie) => ({ atoms: sortie.atoms, rejected: sortie.rejected ?? null }));

export type ExtractAtomsOutput = z.infer<typeof extractAtomsValidation>;

export const EXTRACT_ATOMS: AiContract<ExtractAtomsOutput> = {
  purpose: "extract_atoms",
  forme: extractAtomsForme,
  validation: extractAtomsValidation,
};
