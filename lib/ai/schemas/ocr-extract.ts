import { z } from "zod";
import { CARACTERES_MAXIMUM } from "@/lib/depots/bornes-du-depot";
import type { ContratDeSortie } from "./contrat-de-sortie";

/**
 * Le texte tiré d'une capture, borné comme un dépôt texte pour que le découpage
 * ne reçoive rien que l'écran de dépôt aurait refusé. La borne tronque : la
 * grammaire ne la tient pas, et rejeter perdrait une lecture payée.
 */

function porteDuTexte(texte: string): boolean {
  return texte.trim().length > 0;
}

export const formeDeLecture = z.object({
  extractedText: z
    .string()
    .max(CARACTERES_MAXIMUM)
    .describe(
      "Le contenu substantiel, sans l'habillage d'interface. Vide si l'image n'en porte pas.",
    ),
  language: z
    .string()
    .regex(/^[a-z]{2}$/)
    .nullish()
    .describe("Code ISO 639-1 de la langue lue, en minuscules. À omettre si rien n'a été lu."),
  usable: z
    .boolean()
    .describe("Faux si l'image ne porte rien à retenir : ni texte, ni texte lisible."),
});

/** Relue : la longueur ne refuse plus rien. */
const sortieLue = formeDeLecture.extend({ extractedText: z.string() });

const validationDeLecture = sortieLue.transform((sortie) => ({
  extractedText: sortie.extractedText.slice(0, CARACTERES_MAXIMUM),
  language: sortie.language ?? null,
  // Déduit du texte plutôt que cru : un désaccord jetterait la lecture.
  usable: porteDuTexte(sortie.extractedText),
  tronque: sortie.extractedText.length > CARACTERES_MAXIMUM,
}));

export type SortieDeLecture = z.infer<typeof validationDeLecture>;

export const CONTRAT_DE_LECTURE: ContratDeSortie<SortieDeLecture> = {
  purpose: "ocr_extract",
  forme: formeDeLecture,
  validation: validationDeLecture,
};
