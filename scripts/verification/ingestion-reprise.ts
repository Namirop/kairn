import { prisma } from "@/lib/db/client";
import { MAX_ATTEMPTS } from "@/lib/db/generation-job";
import { deposer } from "@/lib/depots/deposer";
import { releverLots, soumettreLotsEnAttente } from "@/lib/jobs/questions";
import { executerJobsEnAttente, formulaire, libererLaJournee } from "./depot-simule";
import { record } from "./journal";

/**
 * Ce qui se passe quand une étape n'aboutit pas.
 *
 * Deux règles à tenir. Le découpage a coûté un appel : ses concepts restent,
 * quoi qu'il arrive ensuite — un dépôt sans ses questions est incomplet, pas
 * perdu. Et un dépôt cesse toujours d'annoncer un travail en cours : aucune
 * étape ne doit pouvoir le laisser tourner indéfiniment.
 */

const TEXTE = `Une requête HTTP conditionnelle envoie \`If-None-Match\` avec l'étiquette reçue à la
réponse précédente. Le serveur compare, et répond 304 sans corps quand la ressource n'a pas changé.
Le navigateur sert alors sa copie, ce qui économise la bande passante mais pas l'aller-retour. Un
\`Cache-Control: immutable\` supprime cet aller-retour, au prix d'une empreinte dans l'URL.`;

async function depotAvecConcepts(userId: string, cle: string): Promise<string> {
  await libererLaJournee(userId);

  const resultat = await deposer(userId, formulaire({ texte: TEXTE, cleEnvoi: cle }));

  if (!resultat.ok) throw new Error(`Dépôt refusé : ${resultat.motif}`);

  await executerJobsEnAttente(resultat.inputId);

  return resultat.inputId;
}

/**
 * Le découpage échoue, faute d'appel possible. Le dépôt n'a rien produit : il
 * s'arrête là, avec un motif, au lieu d'annoncer un travail en cours.
 */
export async function casDecoupageImpossible(userId: string): Promise<void> {
  await libererLaJournee(userId);

  const resultat = await deposer(userId, formulaire({ texte: TEXTE, cleEnvoi: "verif-coupure" }));

  if (!resultat.ok) throw new Error(`Dépôt refusé : ${resultat.motif}`);

  process.env.AI_ENABLED = "false";
  await executerJobsEnAttente(resultat.inputId);
  process.env.AI_ENABLED = "true";

  const depot = await prisma.input.findUniqueOrThrow({
    where: { id: resultat.inputId },
    include: { jobs: true },
  });

  record(
    "Découpage impossible — le dépôt s'arrête avec un motif, pas en cours",
    depot.status === "FAILED" && (depot.failureReason ?? "").length > 0,
    `${depot.status} — ${depot.failureReason ?? "aucun motif"}`,
  );

  const technique = depot.jobs[0]?.lastError ?? "";
  record(
    "Découpage impossible — l'erreur technique reste sur le job, pas à l'écran",
    depot.jobs.every((job) => job.status === "FAILED") &&
      technique.length > 0 &&
      technique !== depot.failureReason,
    technique || "aucun motif",
  );

  await prisma.input.delete({ where: { id: resultat.inputId } });
}

/**
 * Le lot part, puis disparaît avant sa relève — processus recyclé, mémoire
 * perdue. Passé le délai d'attente, ses jobs reviennent à la file.
 */
export async function casLotPerdu(userId: string): Promise<void> {
  const inputId = await depotAvecConcepts(userId, "verif-lot-perdu");

  await soumettreLotsEnAttente();
  await prisma.aiBatch.updateMany({
    where: { jobs: { some: { inputId } } },
    data: { createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
  });

  // Le lot simulé ne vit qu'en mémoire du processus : le relire une fois suffit
  // à l'oublier, ce qui reproduit exactement le lot qui ne revient jamais.
  const { readAIBatch } = await import("@/lib/ai/batch");
  const { GENERATE_VARIANTS } = await import("@/lib/ai/schemas");
  const lot = await prisma.aiBatch.findFirstOrThrow({ where: { jobs: { some: { inputId } } } });
  await readAIBatch(lot.providerId, GENERATE_VARIANTS);

  await releverLots();

  const job = await prisma.generationJob.findFirstOrThrow({ where: { inputId, kind: "VARIANTS" } });
  const ferme = await prisma.aiBatch.findUniqueOrThrow({ where: { id: lot.id } });

  record(
    "Lot perdu — le lot est clos en échec et son job revient à la file",
    ferme.status === "FAILED" && job.status === "QUEUED" && job.batchId === null,
    `lot ${ferme.status}, job ${job.status}, tentative ${job.attempts}`,
  );

  // Ce job reste en attente : on le retire pour que le cas suivant parte seul.
  await prisma.input.delete({ where: { id: inputId } });
}

/**
 * Le même lot échoue jusqu'au bout. Les questions manquent, les concepts
 * restent, et le dépôt cesse enfin d'annoncer un travail en cours.
 */
export async function casEchecPartiel(userId: string): Promise<void> {
  const inputId = await depotAvecConcepts(userId, "verif-echec-partiel");

  for (let tentative = 0; tentative < MAX_ATTEMPTS; tentative += 1) {
    await soumettreLotsEnAttente();

    const lot = await prisma.aiBatch.findFirstOrThrow({
      where: { status: "SUBMITTED", jobs: { some: { inputId } } },
    });

    await prisma.aiBatch.update({
      where: { id: lot.id },
      data: { createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    });

    const { readAIBatch } = await import("@/lib/ai/batch");
    const { GENERATE_VARIANTS } = await import("@/lib/ai/schemas");
    await readAIBatch(lot.providerId, GENERATE_VARIANTS);
    await releverLots();
  }

  const depot = await prisma.input.findUniqueOrThrow({
    where: { id: inputId },
    include: { atoms: { include: { variants: true } }, jobs: true },
  });
  const questions = depot.atoms.flatMap((atome) => atome.variants);
  const enEchec = depot.jobs.filter((job) => job.status === "FAILED");

  record(
    "Échec à mi-parcours — le dépôt garde ses concepts et ne reste pas en cours",
    depot.status === "READY" && depot.atoms.length === 3 && questions.length === 0,
    `${depot.status}, ${depot.atoms.length} concepts, ${questions.length} questions`,
  );

  record(
    "Échec à mi-parcours — le job cesse après trois tentatives, motif enregistré",
    enEchec.length === 1 && (enEchec[0]?.lastError ?? "").length > 0,
    `${enEchec.length} job(s) en échec — ${enEchec[0]?.lastError ?? "sans motif"}`,
  );
}
