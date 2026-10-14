import { z } from "zod";
import { CARACTERES_MAXIMUM } from "@/lib/depots/bornes-du-depot";
import type { AiContract } from "./contract";

/**
 * Le texte tiré d'une capture d'écran.
 *
 * Sa borne de longueur est celle d'un dépôt texte, pour que le découpage ne
 * reçoive rien qu'un écran n'aurait laissé passer. Elle tronque au lieu de
 * refuser : la grammaire ne la tient pas, et rejeter ferait perdre une lecture
 * déjà payée (même règle que l'extraction).
 */

function porteDuTexte(texte: string): boolean {
  return texte.trim().length > 0;
}

export const ocrExtractForme = z.object({
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

/** La même forme, relue : la longueur n'y refuse plus rien. */
const sortieLue = ocrExtractForme.extend({ extractedText: z.string() });

const ocrExtractValidation = sortieLue.transform((sortie) => ({
  extractedText: sortie.extractedText.slice(0, CARACTERES_MAXIMUM),
  language: sortie.language ?? null,
  // `usable` se déduit du texte plutôt que d'être cru : un désaccord avec le
  // texte rendu jetterait sinon la lecture entière.
  usable: porteDuTexte(sortie.extractedText),
  /** La capture disait plus que ce qu'un dépôt peut porter : on l'a coupée. */
  tronque: sortie.extractedText.length > CARACTERES_MAXIMUM,
}));

export type OcrExtractOutput = z.infer<typeof ocrExtractValidation>;

export const OCR_EXTRACT: AiContract<OcrExtractOutput> = {
  purpose: "ocr_extract",
  forme: ocrExtractForme,
  validation: ocrExtractValidation,
};
