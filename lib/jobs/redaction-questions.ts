import { callAI } from "@/lib/ai/client";
import { SortieTronqueeError } from "@/lib/ai/errors";
import { promptsSysteme } from "@/lib/ai/prompts";
import { lireLaConfigEffective } from "@/lib/ai/reglages-effectifs";
import { contratDeGeneration } from "@/lib/ai/schemas";
import { emplacementDuTexteATrou } from "@/lib/domain/emplacement-du-trou";
import { prisma } from "@/lib/db/client";
import { reprendreCeQuiManque } from "@/lib/db/jobs-de-generation";
import type { GenerationJob } from "@/lib/db/types";
import { ecrireQuestions } from "@/lib/db/variants";
import { sansAffirmationMuette } from "@/lib/domain/affirmation-muette";
import { sansRenvoiAuConcept } from "@/lib/domain/renvoi-au-concept";
import { messageDuGroupe } from "@/lib/domain/envoi-de-questions";
import { LotIncomplet, scinderApresTroncature } from "./reprise-du-lot";

/** En appel direct : l'entraînement les rend utiles dès le dépôt. */

/** Dans l'ordre du job : c'est le rang annoncé au modèle. */
export async function conceptsDuJob(atomIds: string[]) {
  const atomes = await prisma.atom.findMany({
    where: { id: { in: atomIds } },
    select: { id: true, concept: true },
  });

  return atomIds.flatMap((id) => atomes.filter((atome) => atome.id === id));
}

/**
 * Semé sur l'id de l'Atom : la cible du vrai ou faux en dérive et reste stable
 * d'une régénération à l'autre. Le banc, sans base, sème sur le concept.
 */
export function messageSemeParAtome(concepts: { id: string; concept: string }[]): string {
  return messageDuGroupe(concepts.map(({ id, concept }) => ({ graine: id, concept })));
}

/** Le trou dérive du premier Atom : la grammaire se compile une fois par appel. */
export function contratDuGroupe(concepts: { id: string }[]) {
  return contratDeGeneration(emplacementDuTexteATrou(concepts[0]?.id ?? ""));
}

type LotRendu = { rang: number; variants: Parameters<typeof ecrireQuestions>[1] };

/**
 * Rend les rangs sans réponse ; un lot manquant n'emporte pas les autres. Le
 * modèle est lu ici : `lib/db/` appelant `lib/ai/` ferait un cycle sur
 * `lib/db/reglages`.
 */
async function rangerLesLots(atomIds: string[], lots: LotRendu[]): Promise<number[]> {
  const { model } = await lireLaConfigEffective();
  const manquants: number[] = [];

  for (const [rang, atomId] of atomIds.entries()) {
    const lot = lots.find((candidat) => candidat.rang === rang + 1);

    if (!lot) {
      manquants.push(rang + 1);
      continue;
    }

    // Filet derrière le prompt, au dernier endroit qui voit un lot entier.
    const gardees = sansAffirmationMuette(sansRenvoiAuConcept(lot.variants));

    // Vaut un lot absent : le concept repart en file plutôt que sans question.
    if (gardees.length === 0) {
      manquants.push(rang + 1);
      continue;
    }

    await ecrireQuestions(atomId, gardees, model);
  }

  return manquants;
}

/** Le modèle nomme des rangs ; la file reprend des concepts. */
function conceptsSansQuestions(atomIds: string[], manquants: number[]): string[] {
  return manquants.flatMap((rang) => {
    const atomId = atomIds[rang - 1];

    return atomId ? [atomId] : [];
  });
}

/**
 * L'exécuteur clôt le job : on rend la main sans le terminer, et on lève s'il
 * manque des questions pour que le motif soit enregistré.
 */
export async function redigerLesQuestions(job: GenerationJob): Promise<void> {
  const depot = await prisma.input.findUnique({
    where: { id: job.inputId },
    select: { userId: true, anonymousSessionId: true, langue: true },
  });
  const concepts = await conceptsDuJob(job.atomIds);

  if (concepts.length === 0) {
    throw new Error(`Les concepts du job ${job.id} ont disparu.`);
  }

  // Une sortie tronquée se reproduirait à l'identique : le groupe repart coupé en deux.
  const rendu = await callAI({
    contract: contratDuGroupe(concepts),
    system: promptsSysteme(depot?.langue ?? "FR").generate_variants,
    jobId: job.id,
    userId: depot?.userId ?? undefined,
    // Sinon l'essai d'un visiteur compterait sur le plafond des comptes.
    anonyme: depot?.anonymousSessionId != null,
    messages: [{ role: "user", content: messageSemeParAtome(concepts) }],
  }).catch(async (erreur: unknown) => {
    if (erreur instanceof SortieTronqueeError) await scinderApresTroncature(job, erreur);

    throw erreur;
  });

  const { lots } = rendu;

  const manquants = await rangerLesLots(job.atomIds, lots);

  if (manquants.length === 0) return;

  // Repris par le cron : l'écran ne signale pas un concept sans question tant
  // qu'un autre est servable.
  const motif = `Aucune question rendue pour le concept ${manquants.join(", ")}.`;

  if (await reprendreCeQuiManque(job.id, conceptsSansQuestions(job.atomIds, manquants), motif)) {
    throw new LotIncomplet(motif);
  }

  throw new Error(motif);
}
