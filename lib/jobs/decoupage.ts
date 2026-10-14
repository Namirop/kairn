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
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import type { GenerationJob } from "@/lib/db/types";
import { declencher } from "./queue";

/**
 * Le découpage d'un dépôt en concepts, suivi aussitôt des questions.
 *
 * Sur un dépôt factuel, un concept douteux n'a pas de questions : il attend une
 * décision plutôt que de river une erreur non vérifiée.
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

  const consigne = depot.instruction?.trim() ?? "";

  const extraction = await callAI({
    // Sans consigne, rien n'est écarté : on ne demande pas au modèle de
    // recopier la part gardée. Voir `contratDExtraction`.
    contract: contratDExtraction(consigne.length > 0),
    system: promptsSysteme(depot.langue).extract_atoms,
    jobId: job.id,
    userId: depot.userId ?? undefined,
    // La visite, et non l'absence de compte : les reprises du cron et les
    // outils internes n'ont pas à puiser dans la part du public.
    anonyme: depot.anonymousSessionId !== null,
    // La consigne voyage à côté du dépôt, jamais dedans.
    messages: [{ role: "user", content: depotADecouper(texte, depot.instruction) }],
  });

  await enregistrerLExtraction(depot.id, {
    nature: extraction.nature,
    conceptsTronques: extraction.tronque,
    // `texteRetenu` refuse une paraphrase, un résumé ou le dépôt entier ;
    // l'écran retombe alors sur le texte d'origine.
    texteRetenu: texteRetenu(texte, extraction.retenu),
  });

  // Seule façon de juger le plafond sur des dépôts réels. Des identifiants et
  // des nombres, jamais le texte.
  console.info(
    `Découpage ${depot.id} : ${extraction.rendus} concept(s) rendus, ${extraction.derives} écarté(s)` +
      ` comme dérivé(s), ${extraction.atoms.length} gardé(s).`,
  );

  if (extraction.atoms.length === 0) {
    // La phrase du modèle, telle quelle : elle dit ce qui manquait à ce dépôt.
    await marquerRejet(
      depot.id,
      extraction.rejected ?? "Il n'y a pas de concept à retenir dans ce dépôt.",
    );
    return;
  }

  const concepts = await enregistrerConcepts(depot.id, extraction.atoms);

  // Ici et pas au dépôt : avant l'extraction, on ignore combien de concepts un
  // texte porte. Les douteux comptent, ils ont coûté la même extraction. Un
  // dépôt anonyme est borné autrement (un dépôt par session, empreinte
  // d'adresse).
  if (depot.userId) {
    const fuseau = await lireFuseauUtilisateur(depot.userId);
    await compterConceptsRetenus(depot.userId, fuseau, concepts.length);
  }

  const questionnables = conceptsAQuestionner(concepts, extraction.nature);

  // Un visiteur obtient un seul concept questionné : assez pour montrer une
  // vraie question, et chaque appel de plus divise le nombre de visiteurs que
  // sert la part journalière des essais.
  const aQuestionner = (depot.userId ? questionnables : questionnables.slice(0, 1)).map(
    (concept) => concept.id,
  );

  if (aQuestionner.length === 0) {
    await marquerPretSiPlusRienEnAttente(depot.id);
    return;
  }

  const jobs = await creerJobsDeQuestions(depot.id, aQuestionner);

  // Si le déclenchement ne part pas (hors contexte de requête, processus
  // recyclé), les jobs restent en file et le cron les reprend.
  for (const job of jobs) declencher(job.id);
}
