import { prisma } from "@/lib/db/client";
import { enregistrerEntrainement, lireTourDentrainement } from "@/lib/db/entrainement";
import { lireSessionDuJour } from "@/lib/db/session-du-jour";
import { noter } from "./journal";

/**
 * L'étanchéité de l'entraînement libre, vérifiée sur la base : une garantie
 * négative, qu'un champ ajouté à l'écriture casserait en silence. On
 * photographie l'Atom, on joue une série d'entraînement, et on compare champ
 * par champ.
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Ce qui ne doit pas bouger : toute la carte ts-fsrs, plus l'état du produit. */
const MEMOIRE = {
  due: true,
  stability: true,
  difficulty: true,
  elapsedDays: true,
  scheduledDays: true,
  learningSteps: true,
  reps: true,
  lapses: true,
  fsrsState: true,
  lastReview: true,
  state: true,
  masterySignaledAt: true,
  archivedAt: true,
} as const;

async function photographier(atomId: string) {
  return prisma.atom.findUniqueOrThrow({ where: { id: atomId }, select: MEMOIRE });
}

/**
 * Les champs qui ont bougé entre deux photos. On compare les clés présentes
 * dans la photo : un champ ajouté à `MEMOIRE` est surveillé sans autre
 * changement.
 */
function champsModifies(avant: object, apres: object): string[] {
  const suivant = new Map(Object.entries(apres));

  return Object.entries(avant)
    .filter(([champ, initial]) => {
      const final = suivant.get(champ);

      return initial instanceof Date && final instanceof Date
        ? initial.getTime() !== final.getTime()
        : initial !== final;
    })
    .map(([champ]) => champ);
}

async function conceptAvecQuatreQuestions(userId: string, libelle: string, due: Date) {
  const input = await prisma.input.create({
    data: {
      userId,
      rawContent: libelle,
      sourceType: "TEXT",
      status: "READY",
      submissionKey: `verif-entrainement-${libelle}-${Date.now()}`,
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

/**
 * Deux concepts pas encore dus : la session n'a rien à servir, la situation où
 * l'entraînement se propose.
 */
export async function casEntrainementEtanche(userId: string, maintenant: Date): Promise<void> {
  const dansDixJours = new Date(maintenant.getTime() + 10 * JOUR_MS);
  const premier = await conceptAvecQuatreQuestions(userId, "entrainement-un", dansDixJours);
  const second = await conceptAvecQuatreQuestions(userId, "entrainement-deux", dansDixJours);

  const sessionAvant = await lireSessionDuJour(userId, maintenant);
  const avant = new Map([
    [premier, await photographier(premier)],
    [second, await photographier(second)],
  ]);

  const tour = await lireTourDentrainement(userId);

  noter(
    "Entraînement — deux concepts non dus donnent huit questions",
    tour.length === 8 && new Set(tour.map((question) => question.variantId)).size === 8,
    `${tour.length} question(s), alors que la session en sert ${sessionAvant.questions.length}`,
  );

  noter(
    "Entraînement — il alterne les concepts",
    tour.every((question, rang) => rang === 0 || question.atomId !== tour[rang - 1]?.atomId),
    tour.map((question) => (question.atomId === premier ? "1" : "2")).join(""),
  );

  // Une série qui accélère : en session, elle lèverait la carte de maîtrise.
  let instant = maintenant;

  for (const [rang, question] of tour.entries()) {
    const ecrit = await enregistrerEntrainement(
      {
        userId,
        atomId: question.atomId,
        variantId: question.variantId,
        note: "GOOD",
        tempsMs: 9000 - rang * 800,
      },
      instant,
    );

    if (!ecrit) throw new Error(`Le passage d'entraînement ${rang} n'a pas été écrit.`);

    instant = new Date(instant.getTime() + 60_000);
  }

  const apres = new Map([
    [premier, await photographier(premier)],
    [second, await photographier(second)],
  ]);

  const bouges = [...avant.entries()].flatMap(([atomId, photo]) =>
    champsModifies(photo, apres.get(atomId) ?? {}),
  );

  noter(
    "Entraînement — huit passages ne déplacent ni échéance, ni stabilité, ni difficulté, ni état",
    bouges.length === 0,
    bouges.length === 0 ? "la mémoire est intacte" : `champs modifiés : ${bouges.join(", ")}`,
  );

  const signales = await prisma.atom.count({
    where: { id: { in: [premier, second] }, masterySignaledAt: { not: null } },
  });

  noter(
    "Entraînement — une série qui accélère ne lève jamais la carte de maîtrise",
    signales === 0,
    `${signales} concept(s) marqué(s)`,
  );

  const compteurs = await prisma.variant.findMany({
    where: { atomId: { in: [premier, second] } },
    select: { sessionCount: true, trainingCount: true, lastSessionAt: true },
  });

  noter(
    "Entraînement — il n'entre pas dans le compteur qui pilote la rotation",
    compteurs.every((v) => v.sessionCount === 0 && v.lastSessionAt === null),
    `${compteurs.filter((v) => v.trainingCount > 0).length} variante(s) comptée(s) en entraînement, ${compteurs.filter((v) => v.sessionCount > 0).length} en session`,
  );

  const passages = await prisma.review.findMany({
    where: { atomId: { in: [premier, second] } },
    select: { mode: true, stabilityBefore: true, stabilityAfter: true },
  });

  noter(
    "Entraînement — les passages sont enregistrés, et portent leur mode",
    passages.length === 8 && passages.every((passage) => passage.mode === "TRAINING"),
    `${passages.length} passage(s), tous en ${new Set(passages.map((p) => p.mode)).size === 1 ? passages[0]?.mode : "modes mélangés"}`,
  );

  noter(
    "Entraînement — la stabilité enregistrée est celle d'avant, inchangée",
    passages.every((passage) => passage.stabilityBefore === passage.stabilityAfter),
    "aucun passage ne prétend avoir fait progresser la mémoire",
  );

  const sessionApres = await lireSessionDuJour(userId, maintenant);

  noter(
    "Entraînement — la session du jour est la même avant et après",
    sessionApres.questions.length === sessionAvant.questions.length &&
      sessionApres.prochainJourServi === sessionAvant.prochainJourServi,
    `${sessionApres.questions.length} question(s), prochain jour ${sessionApres.prochainJourServi}`,
  );
}
