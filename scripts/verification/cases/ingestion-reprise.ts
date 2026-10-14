import { prisma } from "@/lib/db/client";
import { deposer } from "@/lib/depots/deposer";
import { runJob } from "@/lib/jobs/runner";
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
 * La lecture d'une capture n'aboutit pas — l'appel lève au lieu de rendre un
 * verdict. Le chemin d'erreur doit effacer les octets comme le fait le chemin
 * qui réussit : c'est précisément là qu'une capture pourrait rester en base.
 */
export async function casLectureImpossible(userId: string, image: File): Promise<void> {
  await libererLaJournee(userId);

  const resultat = await deposer(
    userId,
    formulaire({ texte: "", cleEnvoi: "verif-lecture-impossible" }, image),
  );

  if (!resultat.ok) throw new Error(`Dépôt refusé : ${resultat.motif}`);

  const avant = await prisma.input.findUniqueOrThrow({ where: { id: resultat.inputId } });

  process.env.AI_ENABLED = "false";
  await executerJobsEnAttente(resultat.inputId);
  process.env.AI_ENABLED = "true";

  const depot = await prisma.input.findUniqueOrThrow({ where: { id: resultat.inputId } });

  record(
    "Lecture impossible — les octets de l'image ne survivent pas à l'échec",
    (avant.imageData?.length ?? 0) > 0 && depot.imageData === null && depot.status === "FAILED",
    depot.imageData === null
      ? `${avant.imageData?.length ?? 0} octets déposés, effacés au refus`
      : `${depot.imageData.length} octets restants`,
  );

  await prisma.input.delete({ where: { id: resultat.inputId } });
}

/**
 * Le job de questions échoue pour de bon. Les questions manquent, les concepts
 * restent, et le dépôt cesse d'annoncer un travail en cours.
 *
 * L'échec est provoqué en vidant le groupe du job de ses concepts : c'est la
 * seule panne dont on sache qu'elle se reproduira à l'identique, donc la seule
 * qui éprouve la fin de course plutôt qu'une reprise.
 */
export async function casEchecPartiel(userId: string): Promise<void> {
  const inputId = await depotAvecConcepts(userId, "verif-echec-partiel");
  const job = await prisma.generationJob.findFirstOrThrow({
    where: { inputId, kind: "VARIANTS", status: "QUEUED" },
  });

  await prisma.generationJob.update({
    where: { id: job.id },
    data: { atomIds: ["concept-disparu"] },
  });

  await runJob(job.id);

  const depot = await prisma.input.findUniqueOrThrow({
    where: { id: inputId },
    include: { atoms: { include: { variants: true } }, jobs: true },
  });
  const questions = depot.atoms.flatMap((atome) => atome.variants);
  const enEchec = depot.jobs.filter((emploi) => emploi.status === "FAILED");

  record(
    "Échec des questions — le dépôt garde ses concepts et ne reste pas en cours",
    depot.status === "READY" && depot.atoms.length === 3 && questions.length === 0,
    `${depot.status}, ${depot.atoms.length} concepts, ${questions.length} questions`,
  );

  record(
    "Échec des questions — le job est refermé en échec, motif enregistré",
    enEchec.length === 1 && (enEchec[0]?.lastError ?? "").length > 0,
    `${enEchec.length} job(s) en échec — ${enEchec[0]?.lastError ?? "sans motif"}`,
  );
}
