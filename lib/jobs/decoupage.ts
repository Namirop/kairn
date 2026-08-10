import { after } from "next/server";
import { callAI } from "@/lib/ai/client";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { EXTRACT_ATOMS } from "@/lib/ai/schemas";
import {
  enregistrerConcepts,
  lireDepot,
  marquerEchec,
  marquerPretSiPlusRienEnAttente,
} from "@/lib/db/ingestion";
import { creerJobsDeQuestions } from "@/lib/db/lots";
import type { GenerationJob } from "@/lib/db/types";
import { soumettreLotsEnAttente } from "./questions";

/**
 * Le découpage d'un dépôt en concepts.
 *
 * C'est le retour visible du geste : l'utilisateur veut voir « cinq concepts »
 * rapidement. Cette étape reste donc un appel normal, alors que les questions
 * qui suivent partent en envoi groupé.
 *
 * Un concept douteux ne part pas en génération. Lui écrire quatre questions
 * riverait une erreur qu'on n'a pas vérifiée ; il attend une décision.
 */
export async function decouperEnConcepts(job: GenerationJob): Promise<void> {
  const depot = await lireDepot(job.inputId);

  if (!depot) throw new Error(`Dépôt ${job.inputId} introuvable.`);

  const texte = (depot.extractedText ?? depot.rawContent).trim();

  if (texte.length === 0) {
    await marquerEchec(depot.id, "Ce dépôt ne contient aucun texte à découper.");
    return;
  }

  const extraction = await callAI({
    contract: EXTRACT_ATOMS,
    system: SYSTEM_PROMPTS.extract_atoms,
    jobId: job.id,
    userId: depot.userId,
    messages: [{ role: "user", content: texte }],
  });

  if (extraction.atoms.length === 0) {
    await marquerEchec(
      depot.id,
      extraction.rejected ?? "Il n'y a pas de concept à retenir dans ce dépôt.",
    );
    return;
  }

  const concepts = await enregistrerConcepts(depot.id, depot.userId, extraction.atoms);
  const aQuestionner = concepts
    .filter((concept) => !concept.uncertain)
    .map((concept) => concept.id);

  if (aQuestionner.length === 0) {
    await marquerPretSiPlusRienEnAttente(depot.id);
    return;
  }

  await creerJobsDeQuestions(depot.id, aQuestionner);

  // La soumission part derrière la réponse, comme le reste du pipeline. Si elle
  // ne part pas, les jobs restent en attente et le cron les soumettra.
  try {
    after(async () => {
      await soumettreLotsEnAttente();
    });
  } catch (error) {
    console.error(
      `Lot du dépôt ${depot.id} non soumis dans la foulée ; le cron s'en chargera.`,
      error,
    );
  }
}
