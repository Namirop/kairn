import { callAI } from "@/lib/ai/client";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { EXTRACT_ATOMS } from "@/lib/ai/schemas";
import { enregistrerConcepts, lireDepot } from "@/lib/db/ingestion";
import { marquerPretSiPlusRienEnAttente, marquerRejet } from "@/lib/db/fin-de-depot";
import { creerJobsDeQuestions } from "@/lib/db/lots";
import { compterConceptsRetenus } from "@/lib/db/quota-depots";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import type { GenerationJob } from "@/lib/db/types";
import { declencher } from "./queue";

/**
 * Le découpage d'un dépôt en concepts.
 *
 * C'est le retour visible du geste : l'utilisateur veut voir « cinq concepts »
 * rapidement. Les questions suivent dans la foulée, en appel direct elles
 * aussi — depuis que l'entraînement libre existe, elles servent à l'instant du
 * dépôt et non plus seulement au lendemain.
 *
 * Un concept douteux ne part pas en génération. Lui écrire quatre questions
 * riverait une erreur qu'on n'a pas vérifiée ; il attend une décision.
 */
export async function decouperEnConcepts(job: GenerationJob): Promise<void> {
  const depot = await lireDepot(job.inputId);

  if (!depot) throw new Error(`Dépôt ${job.inputId} introuvable.`);

  const texte = (depot.extractedText ?? depot.rawContent).trim();

  if (texte.length === 0) {
    // Un rejet, pas une panne : rien ne s'est cassé, il n'y avait rien.
    await marquerRejet(depot.id, "Ce dépôt ne contient aucun texte à découper.");
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
    // La phrase du modèle, telle quelle. C'est elle qui dit ce qui manquait à
    // ce dépôt-là, et c'est la seule chose qu'un rejet ait à offrir.
    await marquerRejet(
      depot.id,
      extraction.rejected ?? "Il n'y a pas de concept à retenir dans ce dépôt.",
    );
    return;
  }

  const concepts = await enregistrerConcepts(depot.id, depot.userId, extraction.atoms);

  // Le compteur du jour se remplit ici, et pas au dépôt : avant l'extraction,
  // personne ne sait combien de concepts un texte porte. Les douteux comptent
  // aussi — ils ont coûté la même extraction, et l'utilisateur peut encore les
  // confirmer.
  const fuseau = await lireFuseauUtilisateur(depot.userId);
  await compterConceptsRetenus(depot.userId, fuseau, concepts.length);

  const aQuestionner = concepts
    .filter((concept) => !concept.uncertain)
    .map((concept) => concept.id);

  if (aQuestionner.length === 0) {
    await marquerPretSiPlusRienEnAttente(depot.id);
    return;
  }

  const jobs = await creerJobsDeQuestions(depot.id, aQuestionner);

  // Les questions partent tout de suite, en appel direct, derrière la réponse.
  // Ça double ce poste — de 0,005 $ à 0,01 $ par concept — et à ce niveau,
  // casser le geste n'en vaut pas la peine : on dépose, on veut jouer.
  //
  // Si le déclenchement ne part pas — hors contexte de requête, processus
  // recyclé —, les jobs restent en attente et la soumission groupée les
  // ramassera. Les questions arrivent tard plutôt que jamais.
  for (const job of jobs) declencher(job.id);
}
