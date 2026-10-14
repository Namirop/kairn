import { z } from "zod";
import { callAI } from "@/lib/ai/client";
import { PROMPT_DE_LECTURE } from "@/lib/ai/prompts";
import { CONTRAT_DE_LECTURE } from "@/lib/ai/schemas";
import { enregistrerTexteLu, lireDepot, oublierImage } from "@/lib/db/ingestion";
import { marquerEchec, marquerRejet } from "@/lib/db/fin-de-depot";
import type { GenerationJob } from "@/lib/db/types";
import { mettreEnFile } from "./queue";
import { textesDesRefus } from "@/lib/depots/textes-des-refus";

/**
 * La lecture d'une capture. Les octets de l'image ne survivent pas à cette
 * étape : ils sont effacés dès que le texte est obtenu ou qu'on sait qu'il n'y
 * en aura pas.
 */

const TYPES_LISIBLES = z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]);

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
    contract: CONTRAT_DE_LECTURE,
    system: PROMPT_DE_LECTURE,
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
    // Rien à lire sur la capture : un rejet, pas une panne.
    await oublierImage(depot.id);
    // Le motif est enregistré puis affiché tel quel : il se dit dans la langue
    // figée sur le dépôt.
    await marquerRejet(depot.id, textesDesRefus(depot.langue)("captureSansTexte"));
    return;
  }

  await enregistrerTexteLu(depot.id, lu.extractedText, lu.tronque);
  await mettreEnFile(depot.id, "ATOMS");
}
