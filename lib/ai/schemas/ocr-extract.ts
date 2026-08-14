import { z } from "zod";
import { CARACTERES_MAXIMUM } from "@/lib/depots/bornes-du-depot";
import type { AiContract } from "./contract";

/**
 * Le texte tiré d'une capture d'écran.
 *
 * La borne de longueur était à 20 000 signes, deux fois et demie ce qu'un compte
 * a le droit de coller. Une capture d'une page dense injectait donc dans le
 * découpage un texte qu'aucun écran n'aurait laissé passer, et que rien ne
 * pouvait prévoir puisque la longueur n'est connue qu'après l'appel de lecture.
 *
 * Elle est maintenant celle d'un dépôt texte, et **elle tronque au lieu de
 * refuser**. Comme toutes les bornes chiffrées, elle n'est pas tenue par la
 * grammaire : la laisser rejeter aurait fait perdre la lecture entière d'une
 * capture trop bavarde, exactement le défaut corrigé sur l'extraction.
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

const ocrExtractValidation = sortieLue
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
    extractedText: sortie.extractedText.slice(0, CARACTERES_MAXIMUM),
    language: sortie.language ?? null,
    usable: sortie.usable,
    /** La capture disait plus que ce qu'un dépôt peut porter : on l'a coupée. */
    tronque: sortie.extractedText.length > CARACTERES_MAXIMUM,
  }));

export type OcrExtractOutput = z.infer<typeof ocrExtractValidation>;

export const OCR_EXTRACT: AiContract<OcrExtractOutput> = {
  purpose: "ocr_extract",
  forme: ocrExtractForme,
  validation: ocrExtractValidation,
};
