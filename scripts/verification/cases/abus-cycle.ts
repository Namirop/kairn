import { prisma } from "@/lib/db/client";
import { desarchiverConcept, modifierConcept } from "@/lib/db/concepts";
import { lireTourDentrainement } from "@/lib/db/entrainement";
import { enregistrerRevision } from "@/lib/db/revision";
import { lireSessionDuJour } from "@/lib/db/session-du-jour";
import { ajouterPassages, fabriquerConcept, viderLeCompte } from "./abus-fabrique";
import { record } from "./journal";

/**
 * Le cycle de vie d'un concept. L'archivage par intervalle est une étiquette,
 * pas une sortie : un concept bien su qui quitterait le cycle contredirait le
 * produit — on croit savoir, et on oublie. Ces cas vérifient que l'étiquette
 * n'exclut rien de plus que ce que l'utilisateur a déclaré.
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Un concept que l'intervalle a archivé, dû aujourd'hui. */
export async function casArchivageAutomatique(userId: string, maintenant: Date): Promise<void> {
  await viderLeCompte(userId);

  const auto = await fabriquerConcept(userId, {
    libelle: "Archivé par l'intervalle",
    due: new Date(maintenant.getTime() - JOUR_MS),
    lastReview: new Date(maintenant.getTime() - 100 * JOUR_MS),
    state: "ARCHIVED",
    scheduledDays: 120,
  });

  const declare = await fabriquerConcept(userId, {
    libelle: "Archivé par l'utilisateur",
    due: new Date(maintenant.getTime() - JOUR_MS),
    lastReview: new Date(maintenant.getTime() - 100 * JOUR_MS),
    state: "ARCHIVED",
    archivedByUser: true,
    archivedAt: new Date(maintenant.getTime() - 100 * JOUR_MS),
    scheduledDays: 95,
  });

  const session = await lireSessionDuJour(userId, maintenant);
  const servis = new Set(session.questions.map((question) => question.atomId));

  record(
    "Archivage — un concept archivé par l'intervalle revient en session quand il est dû",
    servis.has(auto.atomId),
    servis.has(auto.atomId) ? "servi" : "jamais reproposé",
  );

  record(
    "Archivage — un concept sorti du cycle par l'utilisateur revient aussi à son échéance",
    servis.has(declare.atomId),
    servis.has(declare.atomId) ? "servi" : "jamais reproposé",
  );

  const tour = await lireTourDentrainement(userId);
  const entrainables = new Set(tour.map((question) => question.atomId));

  record(
    "Entraînement — l'archivage par intervalle n'écarte pas le concept de l'entraînement",
    entrainables.has(auto.atomId),
    entrainables.has(auto.atomId) ? "proposé" : "écarté avec les archivages déclarés",
  );

  record(
    "Entraînement — l'archivage déclaré, lui, écarte bien le concept",
    !entrainables.has(declare.atomId),
    entrainables.has(declare.atomId) ? "proposé malgré la déclaration" : "écarté",
  );
}

/** Le geste inverse : remettre en cycle ce qu'on en avait sorti. */
export async function casDesarchivage(userId: string, maintenant: Date): Promise<void> {
  await viderLeCompte(userId);

  const court = await fabriquerConcept(userId, {
    libelle: "Sorti du cycle après un mois",
    due: new Date(maintenant.getTime() + 90 * JOUR_MS),
    lastReview: new Date(maintenant.getTime() - 30 * JOUR_MS),
    state: "ARCHIVED",
    archivedByUser: true,
    archivedAt: new Date(maintenant.getTime() - 30 * JOUR_MS),
    scheduledDays: 30,
  });
  await ajouterPassages(
    userId,
    court,
    ["GOOD", "GOOD", "GOOD"],
    new Date(maintenant.getTime() - 40 * JOUR_MS),
  );

  const long = await fabriquerConcept(userId, {
    libelle: "Sorti du cycle après quatre mois",
    due: new Date(maintenant.getTime() + 90 * JOUR_MS),
    lastReview: new Date(maintenant.getTime() - 30 * JOUR_MS),
    state: "ARCHIVED",
    archivedByUser: true,
    archivedAt: new Date(maintenant.getTime() - 30 * JOUR_MS),
    scheduledDays: 120,
  });
  await ajouterPassages(
    userId,
    long,
    ["GOOD", "GOOD", "GOOD"],
    new Date(maintenant.getTime() - 40 * JOUR_MS),
  );

  await desarchiverConcept(court.atomId, userId, maintenant);
  await desarchiverConcept(long.atomId, userId, maintenant);

  const relus = await prisma.atom.findMany({
    where: { id: { in: [court.atomId, long.atomId] } },
    select: { id: true, state: true, due: true, archivedAt: true, archivedByUser: true },
  });
  const apresCourt = relus.find((atome) => atome.id === court.atomId);
  const apresLong = relus.find((atome) => atome.id === long.atomId);

  record(
    "Désarchivage — l'échéance revient à maintenant et la marque d'archivage tombe",
    relus.every(
      (atome) =>
        !atome.archivedByUser &&
        atome.archivedAt === null &&
        atome.due.getTime() === maintenant.getTime(),
    ),
    relus.map((atome) => `${atome.state} dû ${atome.due.toISOString().slice(0, 10)}`).join(", "),
  );

  record(
    "Désarchivage — l'état se recalcule et ne reste pas collé à ARCHIVED",
    apresCourt?.state !== "ARCHIVED" && apresLong?.state !== "ARCHIVED",
    `intervalle 30 j → ${apresCourt?.state}, intervalle 120 j → ${apresLong?.state}`,
  );

  const session = await lireSessionDuJour(userId, maintenant);
  const servis = new Set(session.questions.map((question) => question.atomId));

  record(
    "Désarchivage — le concept remis en cycle est servi le jour même",
    servis.has(court.atomId) && servis.has(long.atomId),
    `${servis.size} concept(s) servi(s) sur 2`,
  );
}

/** Réécrire un concept : ses questions ne le décrivent plus, sa carte non plus. */
export async function casModification(userId: string, maintenant: Date): Promise<void> {
  await viderLeCompte(userId);

  const concept = await fabriquerConcept(userId, {
    libelle: "Un concept déjà révisé plusieurs fois",
    due: new Date(maintenant.getTime() + 30 * JOUR_MS),
    lastReview: new Date(maintenant.getTime() - JOUR_MS),
    state: "REVIEWING",
    scheduledDays: 30,
  });
  await ajouterPassages(
    userId,
    concept,
    ["GOOD", "HARD", "GOOD"],
    new Date(maintenant.getTime() - 10 * JOUR_MS),
  );

  const texte = "Une reformulation du même concept, assez longue pour passer la borne du geste.";
  await modifierConcept(concept.atomId, userId, texte);

  const apres = await prisma.atom.findUniqueOrThrow({
    where: { id: concept.atomId },
    select: {
      concept: true,
      state: true,
      reps: true,
      scheduledDays: true,
      stability: true,
      lastReview: true,
      // Servables et passées comptées à part : les anciennes questions doivent
      // sortir du tirage sans sortir de l'histoire.
      _count: {
        select: { variants: { where: { retiredAt: null } }, reviews: true },
      },
    },
  });
  const gardees = await prisma.variant.count({ where: { atomId: concept.atomId } });
  const demandes = await prisma.generationJob.count({
    where: { kind: "VARIANTS", atomIds: { has: concept.atomId } },
  });

  record(
    "Modification — les anciennes questions ne sont plus servables, mais restent citables",
    apres._count.variants === 0 && gardees === 4,
    `${apres._count.variants} servable(s) sur ${gardees} conservée(s)`,
  );

  record(
    "Modification — des questions neuves sont demandées",
    demandes === 1,
    `${demandes} demande(s) en file`,
  );

  record(
    "Modification — la planification repart de zéro",
    apres.state === "LEARNING" &&
      apres.reps === 0 &&
      apres.scheduledDays === 0 &&
      apres.stability === 0 &&
      apres.lastReview === null,
    `${apres.state}, ${apres.reps} passage(s), intervalle ${apres.scheduledDays} j`,
  );

  record(
    "Modification — les passages déjà donnés restent dans l'histoire",
    apres._count.reviews === 3,
    `${apres._count.reviews} passage(s) sur 3 conservé(s)`,
  );
}

/** Le même geste, pendant qu'une session est ouverte sur ce concept. */
export async function casModificationPendantSession(
  userId: string,
  maintenant: Date,
): Promise<void> {
  await viderLeCompte(userId);

  const concept = await fabriquerConcept(userId, {
    libelle: "Un concept en cours de session",
    due: new Date(maintenant.getTime() - JOUR_MS),
    lastReview: new Date(maintenant.getTime() - 10 * JOUR_MS),
    state: "REVIEWING",
    scheduledDays: 12,
  });

  const session = await lireSessionDuJour(userId, maintenant);
  const enMain = session.questions.find((question) => question.atomId === concept.atomId);

  if (!enMain) throw new Error("La session aurait dû servir ce concept.");

  await modifierConcept(
    concept.atomId,
    userId,
    "Le même concept, réécrit pendant que la question est à l'écran.",
  );

  const ecrit = await enregistrerRevision(
    {
      userId,
      atomId: concept.atomId,
      variantId: enMain.variantId,
      note: "GOOD",
      tempsMs: 4200,
      maitrise: false,
    },
    maintenant,
  );

  record(
    "Modification — une réponse en cours de session n'est pas perdue",
    ecrit !== null,
    ecrit === null ? "réponse refusée, la question n'existe plus" : "réponse écrite",
  );
}
