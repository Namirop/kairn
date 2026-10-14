import { callAI } from "@/lib/ai/client";
import { AITruncatedOutputError } from "@/lib/ai/errors";
import { promptsSysteme } from "@/lib/ai/prompts";
import { lireLaConfigEffective } from "@/lib/ai/reglages-effectifs";
import { contratDeGeneration } from "@/lib/ai/schemas";
import { emplacementDuTexteATrou } from "@/lib/domain/emplacement-du-trou";
import { prisma } from "@/lib/db/client";
import { reprendreCeQuiManque } from "@/lib/db/generation-job";
import type { GenerationJob } from "@/lib/db/types";
import { ecrireQuestions } from "@/lib/db/variants";
import { sansAffirmationMuette } from "@/lib/domain/affirmation-muette";
import { sansRenvoiAuConcept } from "@/lib/domain/renvoi-au-concept";
import { messageDuGroupe as construireLEnvoi } from "@/lib/domain/envoi-de-questions";
import { LotIncomplet, scinderApresTroncature } from "./reprise-du-lot";

/**
 * L'écriture des questions d'un job, en appel direct : l'entraînement les rend
 * utiles dès l'instant du dépôt.
 */

/** Les concepts d'un job, dans l'ordre du job : c'est le rang annoncé au modèle. */
export async function conceptsDuJob(atomIds: string[]) {
  const atomes = await prisma.atom.findMany({
    where: { id: { in: atomIds } },
    select: { id: true, concept: true },
  });

  return atomIds.flatMap((id) => atomes.filter((atome) => atome.id === id));
}

/**
 * L'envoi d'un groupe. La graine est l'id de l'Atom : la cible du vrai ou faux
 * en dérive, et doit rester stable d'une régénération à l'autre. Le banc, qui
 * n'écrit rien en base, sème sur le texte du concept.
 */
export function messageDuGroupe(concepts: { id: string; concept: string }[]): string {
  return construireLEnvoi(concepts.map(({ id, concept }) => ({ graine: id, concept })));
}

/**
 * Le contrat de cet envoi, avec l'emplacement du texte à trou déjà décidé. Il
 * dérive du premier Atom et vaut pour tout l'appel, la grammaire étant compilée
 * une fois par appel.
 */
export function contratDuGroupe(concepts: { id: string }[]) {
  return contratDeGeneration(emplacementDuTexteATrou(concepts[0]?.id ?? ""));
}

type LotRendu = { rang: number; variants: Parameters<typeof ecrireQuestions>[1] };

/**
 * Range les lots rendus sous leurs concepts et rend les rangs restés sans
 * réponse. Un lot manquant n'emporte pas les autres.
 *
 * Le modèle est lu ici et descendu jusqu'à l'écriture : `lib/db/` qui
 * appellerait `lib/ai/` refermerait un cycle sur `lib/db/reglages`.
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

    // Filet derrière le prompt, au dernier endroit qui voit un lot entier :
    // une question qui renvoie au concept (jamais montré en révision) et un vrai
    // ou faux sans verdict ne s'écrivent pas. Voir `sansRenvoiAuConcept` et
    // `sansAffirmationMuette`.
    const gardees = sansAffirmationMuette(sansRenvoiAuConcept(lot.variants));

    // Un lot écarté en entier vaut un lot absent : le concept repart en file
    // au lieu de rester sans question sur un job clos en succès.
    if (gardees.length === 0) {
      manquants.push(rang + 1);
      continue;
    }

    await ecrireQuestions(atomId, gardees, model);
  }

  return manquants;
}

/** Les rangs (ce que le modèle nomme) ramenés aux concepts, qui repartent en file. */
function conceptsSansQuestions(atomIds: string[], manquants: number[]): string[] {
  return manquants.flatMap((rang) => {
    const atomId = atomIds[rang - 1];

    return atomId ? [atomId] : [];
  });
}

/**
 * Un appel, les questions écrites. L'exécuteur clôt le job : on lui rend la
 * main sans le terminer, et on lève quand il manque des questions pour que le
 * motif soit enregistré.
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

  // Une sortie coupée au plafond se reproduirait à l'identique : le groupe
  // repart coupé en deux (`scinderApresTroncature`) plutôt qu'en échec.
  const rendu = await callAI({
    contract: contratDuGroupe(concepts),
    system: promptsSysteme(depot?.langue ?? "FR").generate_variants,
    jobId: job.id,
    userId: depot?.userId ?? undefined,
    // L'essai d'un visiteur passe aussi par ici : sans ce drapeau, sa question
    // se compterait sur le plafond des comptes au lieu de la part publique.
    anonyme: depot?.anonymousSessionId != null,
    messages: [{ role: "user", content: messageDuGroupe(concepts) }],
  }).catch(async (erreur: unknown) => {
    if (erreur instanceof AITruncatedOutputError) await scinderApresTroncature(job, erreur);

    throw erreur;
  });

  const { lots } = rendu;

  const manquants = await rangerLesLots(job.atomIds, lots);

  if (manquants.length === 0) return;

  // Ce qui manque repart en file, où le cron le reprend : sinon ces concepts
  // resteraient sans question, et l'écran ne le dit pas tant qu'un seul est
  // servable.
  const motif = `Aucune question rendue pour le concept ${manquants.join(", ")}.`;

  if (await reprendreCeQuiManque(job.id, conceptsSansQuestions(job.atomIds, manquants), motif)) {
    throw new LotIncomplet(motif);
  }

  throw new Error(motif);
}
