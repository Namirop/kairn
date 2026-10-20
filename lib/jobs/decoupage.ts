import { callAI } from "@/lib/ai/client";
import { promptsSysteme } from "@/lib/ai/prompts";
import { depotADecouper } from "@/lib/ai/prompts/depot-a-decouper";
import { contratDExtraction } from "@/lib/ai/schemas";
import { enregistrerConcepts, enregistrerLExtraction, lireDepot } from "@/lib/db/ingestion";
import { conceptsAQuestionner } from "@/lib/domain/nature-du-depot";
import { texteRetenu } from "@/lib/domain/texte-retenu";
import { marquerPretSiPlusRienEnAttente, marquerRejet } from "@/lib/db/fin-de-depot";
import { creerJobsDeQuestions } from "@/lib/db/lots";
import { compterConceptsRetenus } from "@/lib/db/comptage-de-la-periode";
import { lireFuseauUtilisateur } from "@/lib/db/reglages-du-compte";
import type { GenerationJob } from "@/lib/db/types";
import { declencher } from "./queue";

/**
 * Suivi aussitôt des questions. Sur un dépôt factuel, un concept douteux attend
 * une décision plutôt que de river une erreur non vérifiée.
 */
export async function decouperEnConcepts(job: GenerationJob): Promise<void> {
  const depot = await lireDepot(job.inputId);

  if (!depot) throw new Error(`Dépôt ${job.inputId} introuvable.`);

  const texte = (depot.extractedText ?? depot.rawContent).trim();

  if (texte.length === 0) {
    // Un rejet, pas une panne : il n'y avait rien.
    await marquerRejet(depot.id, "Ce dépôt ne contient aucun texte à découper.");
    return;
  }

  const consigne = depot.instruction?.trim() ?? "";

  const extraction = await callAI({
    // Sans consigne, rien n'est écarté : pas de part gardée à recopier.
    contract: contratDExtraction(consigne.length > 0),
    system: promptsSysteme(depot.langue).extract_atoms,
    jobId: job.id,
    userId: depot.userId ?? undefined,
    // La visite, pas l'absence de compte : le cron et les outils internes ne
    // puisent pas dans la part du public.
    anonyme: depot.anonymousSessionId !== null,
    messages: [{ role: "user", content: depotADecouper(texte, depot.instruction) }],
  });

  await enregistrerLExtraction(depot.id, {
    nature: extraction.nature,
    conceptsTronques: extraction.tronque,
    // Refusé (paraphrase, résumé, dépôt entier), l'écran montre l'original.
    texteRetenu: texteRetenu(texte, extraction.retenu),
  });

  // Pour juger le plafond sur des dépôts réels. Jamais le texte.
  console.info(
    `Découpage ${depot.id} : ${extraction.rendus} concept(s) rendus, ${extraction.derives} écarté(s)` +
      ` comme dérivé(s), ${extraction.atoms.length} gardé(s).`,
  );

  if (extraction.atoms.length === 0) {
    // La phrase du modèle dit ce qui manquait à ce dépôt.
    await marquerRejet(
      depot.id,
      extraction.rejected ?? "Il n'y a pas de concept à retenir dans ce dépôt.",
    );
    return;
  }

  const concepts = await enregistrerConcepts(depot.id, extraction.atoms);

  // Ici : avant l'extraction, on ignore le nombre. Les douteux comptent, ils ont
  // coûté autant. L'anonyme est borné par visite et par adresse.
  if (depot.userId) {
    const fuseau = await lireFuseauUtilisateur(depot.userId);
    await compterConceptsRetenus(depot.userId, fuseau, concepts.length);
  }

  const questionnables = conceptsAQuestionner(concepts, extraction.nature);

  // Un seul pour un visiteur : chaque appel de plus divise le nombre de
  // visiteurs que sert la part journalière.
  const aQuestionner = (depot.userId ? questionnables : questionnables.slice(0, 1)).map(
    (concept) => concept.id,
  );

  if (aQuestionner.length === 0) {
    await marquerPretSiPlusRienEnAttente(depot.id);
    return;
  }

  const jobs = await creerJobsDeQuestions(depot.id, aQuestionner);

  // S'il ne part pas, le cron reprend les jobs restés en file.
  for (const job of jobs) declencher(job.id);
}
