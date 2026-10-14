import { prisma } from "@/lib/db/client";
import { enregistrerRevision } from "@/lib/db/revision";
import { lireSessionDuJour } from "@/lib/db/session-du-jour";
import { record } from "./journal";

/**
 * Une session de révision jouée en entier, sur des concepts fabriqués pour
 * l'occasion.
 *
 * Les passages sont écrits par le même chemin que l'interface — la lecture de
 * session puis `enregistrerRevision` — et non par des écritures Prisma montées
 * à la main : une vérification qui contourne le chemin réel ne prouve rien du
 * chemin réel.
 */

const FACETTES = ["RECOGNITION", "MECHANISM", "BOUNDARY", "APPLICATION"] as const;

const JOUR_MS = 24 * 60 * 60 * 1000;

async function poserConcept(
  userId: string,
  inputId: string,
  concept: string,
  tags: string[],
  dueDansJours: number,
  maintenant: Date,
): Promise<string> {
  const atome = await prisma.atom.create({
    data: {
      inputId,
      userId,
      concept,
      tags,
      due: new Date(maintenant.getTime() + dueDansJours * JOUR_MS),
    },
    select: { id: true },
  });

  await prisma.variant.createMany({
    data: FACETTES.map((facet, rang) => ({
      atomId: atome.id,
      format: rang === 0 ? ("MCQ" as const) : ("SHORT_ANSWER" as const),
      facet,
      question: `${concept} — ${facet} ?`,
      answerKey: `Réponse ${facet}`,
      payload: rang === 0 ? { options: ["a", "b", "c", "d"], correctIndex: 1 } : undefined,
    })),
  });

  return atome.id;
}

async function depotDeTravail(userId: string): Promise<string> {
  const input = await prisma.input.create({
    data: {
      userId,
      rawContent: "Support des concepts de vérification.",
      sourceType: "TEXT",
      status: "READY",
      submissionKey: `verif-session-${Date.now()}`,
    },
    select: { id: true },
  });

  return input.id;
}

/** Une session entière : tout ce qui est dû passe, et rien d'autre. */
export async function casSessionComplete(userId: string, maintenant: Date): Promise<void> {
  const inputId = await depotDeTravail(userId);

  await poserConcept(
    userId,
    inputId,
    "Concept dû depuis trois jours",
    ["postgres"],
    -3,
    maintenant,
  );
  await poserConcept(userId, inputId, "Concept dû aujourd'hui", ["react"], 0, maintenant);
  await poserConcept(userId, inputId, "Concept dû dans dix jours", ["http"], 10, maintenant);

  const session = await lireSessionDuJour(userId, maintenant);

  record(
    "Session — seuls les concepts échus entrent, jamais de remplissage",
    session.questions.length === 2,
    `${session.questions.length} question(s) pour 3 concepts, dont un à échéance dans dix jours`,
  );

  const sujets = session.questions.map((q) => q.tags[0] ?? "-");
  record(
    "Session — les sujets alternent",
    new Set(sujets).size === sujets.length,
    sujets.join(" puis "),
  );

  let ecrites = 0;

  for (const question of session.questions) {
    const resultat = await enregistrerRevision(
      {
        userId,
        atomId: question.atomId,
        variantId: question.variantId,
        note: "GOOD",
        tempsMs: 5_000,
        maitrise: false,
      },
      maintenant,
    );

    if (resultat) ecrites += 1;
  }

  const passages = await prisma.review.count({ where: { userId } });

  record(
    "Session — chaque passage est écrit au moment où il est donné",
    ecrites === session.questions.length && passages === session.questions.length,
    `${passages} passage(s) en base`,
  );

  const apres = await lireSessionDuJour(userId, maintenant);
  record(
    "Session — ce qui vient d'être revu ne revient pas dans la foulée",
    apres.questions.length === 0,
    `${apres.questions.length} question(s) restante(s)`,
  );
}

/**
 * Une session laissée en plan.
 *
 * On répond à deux questions sur quatre puis on s'arrête net, comme un onglet
 * qu'on ferme. Les deux passages donnés doivent être en base.
 */
export async function casSessionInterrompue(userId: string, maintenant: Date): Promise<void> {
  const inputId = await depotDeTravail(userId);

  for (const sujet of ["a", "b", "c", "d"]) {
    await poserConcept(userId, inputId, `Concept ${sujet}`, [sujet], -1, maintenant);
  }

  const session = await lireSessionDuJour(userId, maintenant);
  const avant = await prisma.review.count({ where: { userId } });

  for (const question of session.questions.slice(0, 2)) {
    await enregistrerRevision(
      {
        userId,
        atomId: question.atomId,
        variantId: question.variantId,
        note: "GOOD",
        tempsMs: 4_000,
        maitrise: false,
      },
      maintenant,
    );
  }

  const apres = await prisma.review.count({ where: { userId } });

  record(
    "Interruption — les passages déjà donnés sont gardés",
    apres - avant === 2,
    `${apres - avant} passage(s) écrit(s) sur 4 questions posées`,
  );

  const restants = await lireSessionDuJour(userId, maintenant);
  record(
    "Interruption — ce qui n'a pas été vu reste dû",
    restants.questions.length === 2,
    `${restants.questions.length} question(s) encore dues`,
  );
}

/** La rotation, éprouvée sur huit passages d'affilée sur un même concept. */
export async function casRotationDesFacettes(userId: string, maintenant: Date): Promise<void> {
  const inputId = await depotDeTravail(userId);
  const atomId = await poserConcept(
    userId,
    inputId,
    "Concept qui revient",
    ["rotation"],
    -1,
    maintenant,
  );

  const servies: string[] = [];
  let instant = maintenant;

  for (let passage = 0; passage < 8; passage += 1) {
    const session = await lireSessionDuJour(userId, instant);
    const question = session.questions.find((candidate) => candidate.atomId === atomId);

    if (!question) break;

    servies.push(question.facet);

    await enregistrerRevision(
      {
        userId,
        atomId,
        variantId: question.variantId,
        note: "AGAIN",
        tempsMs: 6_000,
        maitrise: false,
      },
      instant,
    );

    // On avance d'un jour pour que le concept redevienne dû au passage suivant.
    instant = new Date(instant.getTime() + JOUR_MS);
    await prisma.atom.update({ where: { id: atomId }, data: { due: instant } });
  }

  const colles = servies.filter((facette, rang) => rang > 0 && facette === servies[rang - 1]);

  record(
    "Rotation — jamais deux fois la même facette d'affilée",
    servies.length >= 4 && colles.length === 0,
    servies.join(" → "),
  );

  record(
    "Rotation — les quatre facettes tournent",
    new Set(servies.slice(0, 4)).size === 4,
    `${new Set(servies).size} facette(s) distincte(s) sur ${servies.length} passages`,
  );
}
