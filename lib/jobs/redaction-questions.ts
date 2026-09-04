import { callAI } from "@/lib/ai/client";
import { AITruncatedOutputError } from "@/lib/ai/errors";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { lireLaConfigEffective } from "@/lib/ai/reglages-effectifs";
import { contratDeGeneration } from "@/lib/ai/schemas";
import { emplacementDuTexteATrou } from "@/lib/domain/emplacement-du-trou";
import { prisma } from "@/lib/db/client";
import { finishJob, reprendreCeQuiManque } from "@/lib/db/generation-job";
import type { GenerationJob } from "@/lib/db/types";
import { ecrireQuestions } from "@/lib/db/variants";
import { sansAffirmationMuette } from "@/lib/domain/affirmation-muette";
import { sansRenvoiAuConcept } from "@/lib/domain/renvoi-au-concept";
import { messageDuGroupe as construireLEnvoi } from "@/lib/domain/envoi-de-questions";
import { LotIncomplet, scinderApresTroncature } from "./reprise-du-lot";

/**
 * L'écriture des questions d'un job.
 *
 * En appel direct, et il n'y en a plus d'autre. Les questions partaient en envoi
 * groupé — moitié prix contre quelques heures — tant qu'elles ne servaient qu'à
 * la première révision ; l'entraînement libre les a rendues utiles à l'instant
 * du dépôt, et le passage à Luna a retiré au demi-tarif sa raison d'être.
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
 * L'envoi d'un groupe, construit là où le banc construit le sien.
 *
 * La graine est l'id de l'Atom : c'est d'elle que dérive la cible du vrai ou
 * faux, et elle doit être stable pour que deux régénérations du même concept ne
 * changent pas de répartition. Le banc, lui, n'écrit rien en base et sème sur le
 * texte du concept.
 */
export function messageDuGroupe(concepts: { id: string; concept: string }[]): string {
  return construireLEnvoi(concepts.map(({ id, concept }) => ({ graine: id, concept })));
}

/**
 * Le contrat de cet envoi-là : l'emplacement du texte à trou y est déjà décidé.
 *
 * Il se dérive du premier Atom du groupe et vaut pour tout l'appel, parce que la
 * grammaire est compilée une fois par appel. Deux régénérations du même job
 * retombent donc sur le même emplacement.
 */
export function contratDuGroupe(concepts: { id: string }[]) {
  return contratDeGeneration(emplacementDuTexteATrou(concepts[0]?.id ?? ""));
}

type LotRendu = { rang: number; variants: Parameters<typeof ecrireQuestions>[1] };

/**
 * Range les lots rendus sous les concepts qui les attendaient.
 *
 * Rend les rangs restés sans réponse. Un lot manquant n'emporte pas les
 * autres : ce qui a été écrit est écrit.
 *
 * Le modèle est lu ici, une fois, et descendu jusqu'à l'écriture. La couche
 * données ne peut pas aller le chercher elle-même : la configuration effective
 * se lit en base, et `lib/db/` qui appellerait `lib/ai/` refermerait un cycle
 * sur `lib/db/reglages`.
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

    /*
      Les questions qui renvoient à un texte qu'on ne montre pas ne sont pas
      écrites.

      La règle est dans le prompt depuis le 28/08 et elle passe le plus souvent ;
      quand elle ne passe pas, ça se sert. « D'après le mécanisme décrit dans le
      concept, pourquoi… » a été posé en session : l'écran de révision ne montre
      jamais le concept, donc la question désignait le vide.

      Écarté ici et pas plus tôt, parce que c'est le dernier endroit qui voit un
      lot entier avant la base. Un lot qui perd une question en garde trois, et
      c'est le prix assumé : voir `sansRenvoiAuConcept`, qui dit pourquoi servir
      coûterait plus cher que renoncer.
    */
    /*
      Et les affirmations qui ne disent pas si elles sont vraies.

      Un vrai ou faux sans verdict ne peut pas se poser : il retombe en question
      ouverte, et l'écran sert alors une phrase à plat — dont une sur deux est
      fausse par construction. Voir `sansAffirmationMuette`.
    */
    const gardees = sansAffirmationMuette(sansRenvoiAuConcept(lot.variants));

    // Un lot écarté en entier vaut un lot absent, et se traite comme tel : le
    // concept repart en file. Sans ça, il resterait sans une seule question sur
    // un job clos en succès — le défaut qu'on venait de fermer ailleurs.
    if (gardees.length === 0) {
      manquants.push(rang + 1);
      continue;
    }

    await ecrireQuestions(atomId, gardees, model);
  }

  return manquants;
}

/**
 * Les concepts d'un job dont aucun lot n'est revenu.
 *
 * `rangerLesLots` rend des **rangs** — c'est ce que le modèle nomme dans sa
 * réponse. Ce qui repart en file, ce sont des concepts.
 */
function conceptsSansQuestions(atomIds: string[], manquants: number[]): string[] {
  return manquants.flatMap((rang) => {
    const atomId = atomIds[rang - 1];

    return atomId ? [atomId] : [];
  });
}

/**
 * La relève d'un lot groupé : elle clôt le job, ou le rend à la file.
 *
 * Un lot qui n'a rien rendu du tout échoue, comme avant. Un lot qui n'a rendu
 * qu'une partie ne se referme plus : ce qui manque repart, ce qui est écrit
 * reste écrit. Voir `reprendreCeQuiManque`.
 */
export async function ecrireLesQuestionsDuJob(
  jobId: string,
  atomIds: string[],
  lots: LotRendu[],
): Promise<void> {
  const manquants = await rangerLesLots(atomIds, lots);

  if (manquants.length === 0) {
    await finishJob(jobId, "DONE");
    return;
  }

  const motif = `Aucune question rendue pour le concept ${manquants.join(", ")}.`;

  if (await reprendreCeQuiManque(jobId, conceptsSansQuestions(atomIds, manquants), motif)) return;

  await finishJob(jobId, "FAILED", motif);
}

/**
 * Le chemin direct : un appel, les questions écrites, et c'est fini.
 *
 * C'est l'exécuteur qui clôt le job — on lui rend donc la main sans le
 * terminer, et on lève quand rien n'a été rendu pour que l'échec soit
 * enregistré avec son motif plutôt qu'avalé.
 */
export async function redigerLesQuestions(job: GenerationJob): Promise<void> {
  const depot = await prisma.input.findUnique({
    where: { id: job.inputId },
    select: { userId: true, anonymousSessionId: true },
  });
  const concepts = await conceptsDuJob(job.atomIds);

  if (concepts.length === 0) {
    throw new Error(`Les concepts du job ${job.id} ont disparu.`);
  }

  /*
    Une sortie coupée au plafond n'est pas un échec ordinaire.

    C'est le seul motif dont on sache d'avance qu'il se reproduira à
    l'identique : la réponse était trop longue, et rien dans un nouvel essai ne
    la raccourcirait. Le groupe repart donc coupé en deux plutôt qu'en échec —
    voir `scinderApresTroncature`, qui ne rend jamais la main.
  */
  const rendu = await callAI({
    contract: contratDuGroupe(concepts),
    system: SYSTEM_PROMPTS.generate_variants,
    jobId: job.id,
    userId: depot?.userId ?? undefined,
    // La part du public, comme pour le découpage : depuis que l'essai montre
    // une question, ce chemin part aussi pour un visiteur. Sans ce drapeau, sa
    // question se facturerait sur le plafond global — celui que la part
    // publique existe précisément pour protéger des comptes, et réciproquement.
    anonyme: depot?.anonymousSessionId != null,
    messages: [{ role: "user", content: messageDuGroupe(concepts) }],
  }).catch(async (erreur: unknown) => {
    if (erreur instanceof AITruncatedOutputError) await scinderApresTroncature(job, erreur);

    throw erreur;
  });

  const { lots } = rendu;

  const manquants = await rangerLesLots(job.atomIds, lots);

  if (manquants.length === 0) return;

  /*
    Ce qui manque repart en file plutôt que de disparaître.

    Le chemin direct écrivait ce qui était venu et s'arrêtait là : un appel qui
    portait trois concepts et n'en rendait qu'un laissait les deux autres sans
    aucune question, définitivement — le cron ne ramasse que les jobs en file, et
    l'écran ne dit rien tant qu'un seul concept est servable. C'est arrivé en
    production le 28/08 sur un dépôt de six concepts.

    La reprise passe par la soumission groupée : moitié prix, quelques heures de
    latence, et c'est le bon compromis pour une dette qui ne presse pas.
  */
  const motif = `Aucune question rendue pour le concept ${manquants.join(", ")}.`;

  if (await reprendreCeQuiManque(job.id, conceptsSansQuestions(job.atomIds, manquants), motif)) {
    throw new LotIncomplet(motif);
  }

  throw new Error(motif);
}
