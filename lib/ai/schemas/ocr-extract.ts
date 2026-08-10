import { z } from "zod";
import type { AiContract } from "./contract";

function porteDuTexte(texte: string): boolean {
  return texte.trim().length > 0;
}

/** Le texte tiré d'une capture d'écran. */
export const ocrExtractForme = z.object({
  extractedText: z
    .string()
    .max(20_000)
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

const ocrExtractValidation = ocrExtractForme
  // Une image sans texte n'a pas de langue : en exiger une ferait inventer une
  // réponse, et une réponse inventée casse un cas normal.
  .refine((sortie) => sortie.usable === porteDuTexte(sortie.extractedText), {
    error: "extractedText est vide si et seulement si usable est faux",
    path: ["extractedText"],
  })
  .refine((sortie) => sortie.usable === ((sortie.language ?? null) !== null), {
    error: "language est renseigné si et seulement si usable est vrai",
    path: ["language"],
  })
  .transform((sortie) => ({
    extractedText: sortie.extractedText,
    language: sortie.language ?? null,
    usable: sortie.usable,
  }));

export type OcrExtractOutput = z.infer<typeof ocrExtractValidation>;

export const OCR_EXTRACT: AiContract<OcrExtractOutput> = {
  purpose: "ocr_extract",
  forme: ocrExtractForme,
  validation: ocrExtractValidation,
};
