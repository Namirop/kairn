import { z } from "zod";
import { callAI } from "@/lib/ai/client";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { OCR_EXTRACT } from "@/lib/ai/schemas";
import { enregistrerTexteLu, lireDepot, oublierImage } from "@/lib/db/ingestion";
import { marquerEchec, marquerRejet } from "@/lib/db/fin-de-depot";
import type { GenerationJob } from "@/lib/db/types";
import { enqueueJob } from "./queue";

/**
 * La lecture d'une capture.
 *
 * Les octets de l'image ne survivent pas à cette étape : dès que le texte est
 * obtenu — ou dès qu'on sait qu'il n'y en aura pas —, ils sont effacés. C'est la
 * seule étape qui les voit.
 */

const TYPES_LISIBLES = z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const RIEN_A_LIRE =
  "Cette capture ne porte pas de texte lisible. Recadre-la sur le passage qui t'intéresse, ou colle le texte directement.";

export async function lireImage(job: GenerationJob): Promise<void> {
  const depot = await lireDepot(job.inputId);

  if (!depot) throw new Error(`Dépôt ${job.inputId} introuvable.`);

  const mediaType = TYPES_LISIBLES.safeParse(depot.imageMediaType);

  if (!depot.imageData || !mediaType.success) {
    await marquerEchec(depot.id, "L'image n'est plus disponible pour être lue.");
    return;
  }

  // Le texte déposé à côté de l'image lui sert de contexte, quand il y en a un.
  const contexte = depot.rawContent.trim();
  const lu = await callAI({
    contract: OCR_EXTRACT,
    system: SYSTEM_PROMPTS.ocr_extract,
    jobId: job.id,
    userId: depot.userId ?? undefined,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            mediaType: mediaType.data,
            base64: Buffer.from(depot.imageData).toString("base64"),
          },
          ...(contexte ? [{ type: "text" as const, text: contexte }] : []),
        ],
      },
    ],
  });

  if (!lu.usable) {
    // La lecture a marché : elle a vu la capture et n'y a rien trouvé à
    // lire. C'est un rejet, pas une panne d'OCR.
    await oublierImage(depot.id);
    await marquerRejet(depot.id, RIEN_A_LIRE);
    return;
  }

  await enregistrerTexteLu(depot.id, lu.extractedText, lu.tronque);
  await enqueueJob(depot.id, "ATOMS");
}
