import { batchTermine, readAIBatch, submitAIBatch } from "@/lib/ai/batch";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { GENERATE_VARIANTS } from "@/lib/ai/schemas";
import { finishJob } from "@/lib/db/generation-job";
import { marquerPretSiPlusRienEnAttente } from "@/lib/db/fin-de-depot";
import {
  cloreLot,
  enregistrerLot,
  lireJobsDuLot,
  lireLotsOuverts,
  noterRelevee,
  rendreJobsALaFile,
  trouverJobsASoumettre,
} from "@/lib/db/lots";
import { conceptsDuJob, ecrireLesQuestionsDuJob, messageDuGroupe } from "./redaction-questions";

/**
 * L'envoi groupé des questions, du départ à la relève.
 *
 * Un job porte un à trois concepts, une requête du lot en porte autant, et la
 * référence de cette requête est l'identifiant du job : c'est elle qui relie
 * une réponse à ce qui l'attend, des heures plus tard.
 *
 * Ce chemin ne sert plus le dépôt — les questions d'un dépôt partent en appel
 * direct pour être là tout de suite. Il sert la régénération, qui peut attendre
 * et coûte moitié prix ainsi, et il ramasse ce que l'appel direct n'a pas
 * réussi à lancer.
 */

/** Requêtes par soumission. Au-delà, une erreur emporterait trop de travail. */
const REQUETES_PAR_LOT = 20;
/** Lots relevés par passage du cron. */
const LOTS_PAR_PASSAGE = 10;
/** Au-delà, un lot sans réponse est signalé, pas relancé en boucle. */
const ATTENTE_MAXIMALE_MS = 24 * 60 * 60 * 1000;

/**
 * Soumet les jobs de questions en attente, pour un compte ou pour tous.
 *
 * `userId` est renseigné quand un geste d'utilisateur déclenche la soumission —
 * corriger un concept, confirmer un concept douteux. Sans lui, le geste d'un
 * compte soumettait les jobs en attente de tous les autres, et prenait des
 * places au plafond global pour du travail qui n'était pas le sien. Le cron,
 * lui, appelle sans identifiant : c'est son rôle de tout ramasser.
 */
export async function soumettreLotsEnAttente(userId?: string): Promise<number> {
  const jobs = await trouverJobsASoumettre(REQUETES_PAR_LOT, new Date(), userId);

  if (jobs.length === 0) return 0;

  const requetes = [];

  for (const job of jobs) {
    const concepts = await conceptsDuJob(job.atomIds);

    if (concepts.length === 0) {
      await finishJob(job.id, "FAILED", "Les concepts de ce job ont disparu.");
      continue;
    }

    requetes.push({
      reference: job.id,
      contract: GENERATE_VARIANTS,
      system: SYSTEM_PROMPTS.generate_variants,
      messages: [{ role: "user" as const, content: messageDuGroupe(concepts) }],
    });
  }

  if (requetes.length === 0) return 0;

  const lot = await submitAIBatch(requetes, userId);
  await enregistrerLot(
    lot.providerId,
    requetes.map((requete) => requete.reference),
  );

  return requetes.length;
}

/**
 * Referme les dépôts touchés par ces jobs, quand plus rien ne les attend. Un
 * job rendu à la file laisse son dépôt en cours ; un job à bout de tentatives
 * le laisse partir avec ce qu'il a.
 */
async function cloreLesDepots(jobs: { inputId: string }[]): Promise<void> {
  for (const inputId of new Set(jobs.map((job) => job.inputId))) {
    await marquerPretSiPlusRienEnAttente(inputId);
  }
}

/** Relève les lots terminés, écrit ce qu'ils rendent, et clôt les dépôts. */
export async function releverLots(maintenant: Date = new Date()): Promise<number> {
  const lots = await lireLotsOuverts(LOTS_PAR_PASSAGE);
  let releves = 0;

  for (const lot of lots) {
    const jobs = await lireJobsDuLot(lot.id);

    if (!(await batchTermine(lot.providerId))) {
      const attente = maintenant.getTime() - lot.createdAt.getTime();

      if (attente > ATTENTE_MAXIMALE_MS) {
        await cloreLot(lot.id, "FAILED");
        await rendreJobsALaFile(
          jobs.map((job) => job.id),
          "Le lot est resté sans réponse.",
        );
        // Les jobs à bout de tentatives sont en échec pour de bon : le dépôt
        // n'a plus rien à attendre et garde ses concepts.
        await cloreLesDepots(jobs);
      } else {
        await noterRelevee(lot.id);
      }

      continue;
    }

    const resultats = await readAIBatch(
      lot.providerId,
      GENERATE_VARIANTS,
      new Map(jobs.map((job) => [job.id, job.id])),
    );

    for (const job of jobs) {
      const resultat = resultats.find((candidat) => candidat.reference === job.id);

      if (!resultat || !("valeur" in resultat)) {
        await finishJob(job.id, "FAILED", resultat?.motif ?? "Aucune réponse dans le lot.");
        continue;
      }

      await ecrireLesQuestionsDuJob(job.id, job.atomIds, resultat.valeur.lots);
    }

    await cloreLot(lot.id, "ENDED");
    releves += 1;

    await cloreLesDepots(jobs);
  }

  return releves;
}
