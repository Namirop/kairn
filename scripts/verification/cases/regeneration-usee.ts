import { prisma } from "@/lib/db/client";
import { enregistrerEntrainement, lireTourDentrainement } from "@/lib/db/entrainement";
import {
  JOURS_ENTRE_REGENERATIONS,
  PASSAGES_AVANT_REGENERATION,
} from "@/lib/domain/rotation-variantes";
import { record } from "./journal";

/**
 * Le renouvellement des questions, éprouvé par l'usage réel.
 *
 * Deux garanties qui coûtent de l'argent si elles lâchent : le seuil d'usure
 * lit bien les deux modes additionnés, et un même concept ne redemande pas de
 * questions plus d'une fois par semaine. La seconde est ce qui empêche
 * quelqu'un qui tourne une heure d'affilée de déclencher une régénération par
 * tour.
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

async function conceptAQuatreQuestions(userId: string, libelle: string, due: Date) {
  const input = await prisma.input.create({
    data: {
      userId,
      rawContent: libelle,
      sourceType: "TEXT",
      status: "READY",
      submissionKey: `verif-usure-${libelle}-${Date.now()}`,
    },
    select: { id: true },
  });

  const atome = await prisma.atom.create({
    data: { inputId: input.id, userId, concept: libelle, tags: [libelle], due },
    select: { id: true },
  });

  for (const facet of ["RECOGNITION", "MECHANISM", "BOUNDARY", "APPLICATION"] as const) {
    await prisma.variant.create({
      data: {
        atomId: atome.id,
        format: "SHORT_ANSWER",
        facet,
        question: `${libelle} — ${facet} ?`,
        answerKey: "Une réponse.",
      },
    });
  }

  return atome.id;
}

async function jobsDeQuestions(atomId: string): Promise<number> {
  return prisma.generationJob.count({ where: { kind: "VARIANTS", atomIds: { has: atomId } } });
}

/** Tourne sur le concept jusqu'à ce que chaque facette ait atteint le seuil. */
async function tournerJusquauSeuil(userId: string, atomId: string, depart: Date): Promise<Date> {
  let instant = depart;

  for (let tour = 0; tour < PASSAGES_AVANT_REGENERATION; tour += 1) {
    const questions = (await lireTourDentrainement(userId)).filter(
      (question) => question.atomId === atomId,
    );

    for (const question of questions) {
      await enregistrerEntrainement(
        { userId, atomId, variantId: question.variantId, note: "GOOD", tempsMs: 4000 },
        instant,
      );
      instant = new Date(instant.getTime() + 60_000);
    }
  }

  return instant;
}

export async function casRegenerationParUsure(userId: string, maintenant: Date): Promise<void> {
  const atomId = await conceptAQuatreQuestions(
    userId,
    "usure",
    new Date(maintenant.getTime() + 30 * JOUR_MS),
  );

  const apresLesTours = await tournerJusquauSeuil(userId, atomId, maintenant);
  const compteurs = await prisma.variant.findMany({
    where: { atomId },
    select: { sessionCount: true, trainingCount: true },
  });

  record(
    "Usure — l'entraînement seul suffit à atteindre le seuil de renouvellement",
    compteurs.every((v) => v.sessionCount === 0 && v.trainingCount >= PASSAGES_AVANT_REGENERATION),
    `${compteurs.length} variantes à ${compteurs[0]?.trainingCount ?? 0} passages d'entraînement, 0 en session`,
  );

  record(
    "Usure — des questions neuves sont demandées, sans bouton ni décision",
    (await jobsDeQuestions(atomId)) === 1,
    `${await jobsDeQuestions(atomId)} demande(s) en file`,
  );

  // On continue à tourner : le seuil reste franchi, et rien ne doit repartir.
  await tournerJusquauSeuil(userId, atomId, apresLesTours);

  record(
    "Usure — le plafond de sept jours tient, quoi qu'on fasse dans la journée",
    (await jobsDeQuestions(atomId)) === 1,
    `${await jobsDeQuestions(atomId)} demande(s) après deux fois plus de passages`,
  );

  // Une semaine plus tard, le même usage redevient légitime.
  //
  // La demande déjà en file porte l'heure réelle de la machine, alors que ce
  // script se déroule à une date fixe : on la recale sur l'instant logique où
  // elle a été écrite, sans quoi le délai se mesurerait entre deux calendriers.
  const plusTard = new Date(apresLesTours.getTime() + (JOURS_ENTRE_REGENERATIONS + 1) * JOUR_MS);
  await prisma.generationJob.updateMany({
    where: { kind: "VARIANTS", atomIds: { has: atomId } },
    data: { status: "DONE", createdAt: apresLesTours, finishedAt: apresLesTours },
  });
  await tournerJusquauSeuil(userId, atomId, plusTard);

  record(
    "Usure — passé le délai, un concept encore tourné redemande des questions",
    (await jobsDeQuestions(atomId)) === 2,
    `${await jobsDeQuestions(atomId)} demande(s) au total`,
  );
}
