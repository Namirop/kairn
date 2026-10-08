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

  const consigne = depot.instruction?.trim() ?? "";

  const extraction = await callAI({
    // La consigne décide de la forme de la sortie comme elle décide de celle du
    // message : sans elle, on ne demande pas au modèle de recopier la part
    // gardée — il n'y a rien d'écarté, et le champ ferait écrire le dépôt une
    // seconde fois pour rien. Voir `contratDExtraction`.
    contract: contratDExtraction(consigne.length > 0),
    system: promptsSysteme(depot.langue).extract_atoms,
    jobId: job.id,
    userId: depot.userId ?? undefined,
    // La visite, et non l'absence de compte : celle-ci couvre aussi les
    // reprises par le cron et les outils internes, qui n'ont personne derrière
    // et n'ont donc pas à puiser dans la part du public.
    anonyme: depot.anonymousSessionId !== null,
    // La consigne voyage avec le dépôt, à côté et jamais dedans. Sans elle, le
    // message reste le texte nu, tel qu'il l'a toujours été.
    messages: [{ role: "user", content: depotADecouper(texte, depot.instruction) }],
  });

  await enregistrerLExtraction(depot.id, {
    nature: extraction.nature,
    conceptsTronques: extraction.tronque,
    // Ce que la consigne a laissé, et seulement s'il en reste un extrait fidèle
    // : `texteRetenu` refuse une paraphrase, un résumé, ou le dépôt entier
    // rendu à l'identique. Un rendu infidèle ne casse rien — l'écran retombe
    // sur le texte d'origine, qui est la vérité.
    texteRetenu: texteRetenu(texte, extraction.retenu),
  });

  // Le compte rendu par le modèle, à chaque découpage : c'est la seule façon de
  // savoir, sur des dépôts réels, si le plafond est posé au bon endroit. Des
  // identifiants et des nombres, jamais le texte.
  console.info(
    `Découpage ${depot.id} : ${extraction.rendus} concept(s) rendus, ${extraction.derives} écarté(s)` +
      ` comme dérivé(s), ${extraction.atoms.length} gardé(s).`,
  );

  if (extraction.atoms.length === 0) {
    // La phrase du modèle, telle quelle. C'est elle qui dit ce qui manquait à
    // ce dépôt-là, et c'est la seule chose qu'un rejet ait à offrir.
    await marquerRejet(
      depot.id,
      extraction.rejected ?? "Il n'y a pas de concept à retenir dans ce dépôt.",
    );
    return;
  }

  const concepts = await enregistrerConcepts(depot.id, extraction.atoms);

  // Le compteur de la période se remplit ici, et pas au dépôt : avant
  // l'extraction, personne ne sait combien de concepts un texte porte. Les
  // douteux comptent aussi — ils ont coûté la même extraction, et l'utilisateur
  // peut encore les confirmer.
  //
  // Un dépôt anonyme n'a pas de compteur : il est borné autrement, par une
  // session à un seul dépôt et par une limite d'empreinte d'adresse.
  if (depot.userId) {
    const fuseau = await lireFuseauUtilisateur(depot.userId);
    await compterConceptsRetenus(depot.userId, fuseau, concepts.length);
  }

  const questionnables = conceptsAQuestionner(concepts, extraction.nature);

  /*
    Un visiteur en obtient **une**, et une seule.

    L'essai s'arrêtait aux concepts, pour n'y dépenser qu'un appel. Il montrait
    donc une moitié du produit : le positionnement tient en « l'extraction
    automatique des Atoms, **plus la rotation des Variants** », et la landing
    promet en toutes lettres qu'on te les repose — à quelqu'un qui ne voyait
    jamais une question. On vendait un mécanisme sans le montrer.

    Une seule suffit à fermer l'arc — ton texte, tes concepts, une vraie
    question sur l'un d'eux. La deuxième ne prouve rien que la première n'ait
    prouvé, et elle double la dépense : le prix n'est pas le dixième de centime,
    c'est la part journalière des essais sans compte, qui sert deux fois moins
    de visiteurs à chaque appel ajouté.
  */
  const aQuestionner = (depot.userId ? questionnables : questionnables.slice(0, 1)).map(
    (concept) => concept.id,
  );

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
