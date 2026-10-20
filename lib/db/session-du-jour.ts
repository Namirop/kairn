import { prisma } from "@/lib/db/client";
import { questionServie, type QuestionServie } from "@/lib/db/question-servie";
import { lireCadreDeSession, lireFuseauUtilisateur } from "@/lib/db/reglages-du-compte";
import { jourSuivant, jourLocal } from "@/lib/domain/jour-local";
import { composerLaJournee } from "@/lib/domain/journee-de-session";
import {
  chargeDuJour,
  estServableAujourdhui,
  jourOuIlRevient,
  plafondRestant,
  type ChargeDuJour,
} from "@/lib/domain/selection-session";

/**
 * La requête ramène large ; `lib/domain/` tranche ce qui est dû, dans quel
 * ordre et sous quelle formulation.
 */

/**
 * Le jour civil finit dans moins de 24 h ; 36 h couvrent fuseaux extrêmes et
 * changements d'heure, `estServableAujourdhui` fait le tri exact.
 */
const MARGE_MS = 36 * 60 * 60 * 1000;

export type SessionDuJour = {
  fuseau: string;
  questions: QuestionServie[];
  /** De quoi distinguer les écrans vides sans deviner. */
  totalConcepts: number;
  conceptsEnAttenteDeQuestions: number;
  /** AAAA-MM-JJ. */
  prochainJourServi: string | null;
  /** Distingue « tu es à jour » de « tu as fait ta journée ». */
  reporteAuLendemain: number;
};

export async function lireSessionDuJour(
  userId: string,
  maintenant: Date = new Date(),
): Promise<SessionDuJour> {
  const { fuseau, plafond } = await lireCadreDeSession(userId);

  const [candidats, totalConcepts, enAttente, prochain, faits] = await Promise.all([
    prisma.atom.findMany({
      where: {
        userId,
        // Un concept douteux attend une décision, pas une révision.
        uncertain: false,
        due: { lte: new Date(maintenant.getTime() + MARGE_MS) },
        variants: { some: { retiredAt: null } },
      },
      select: {
        id: true,
        concept: true,
        tags: true,
        due: true,
        inputId: true,
        lastReview: true,
        // L'intervalle promis dit si le retard est grave.
        scheduledDays: true,
        variants: {
          where: { retiredAt: null },
          select: {
            id: true,
            format: true,
            facet: true,
            question: true,
            answerKey: true,
            payload: true,
            sessionCount: true,
            lastSessionAt: true,
            trainingCount: true,
          },
        },
        // Le dernier passage donne la facette à ne pas resservir.
        reviews: {
          orderBy: { reviewedAt: "desc" },
          take: 1,
          select: { variant: { select: { facet: true } } },
        },
      },
    }),
    prisma.atom.count({ where: { userId } }),
    prisma.atom.count({ where: { userId, uncertain: false, variants: { none: {} } } }),
    prisma.atom.findMany({
      where: { userId, uncertain: false, variants: { some: { retiredAt: null } } },
      orderBy: { due: "asc" },
      select: { due: true, lastReview: true },
      // Le prochain jour servi est parmi les plus proches échéances.
      take: 50,
    }),
    compterFaitsAujourdhui(userId, maintenant, fuseau),
  ]);

  // Plafond journalier : le déjà revu du jour en fait partie.
  const reste = plafondRestant(plafond, faits);

  const { servis, dus } = composerLaJournee(
    candidats,
    (atome) => atome.reviews[0]?.variant.facet ?? null,
    maintenant,
    fuseau,
    reste,
  );

  const questions = servis.map((concept) =>
    questionServie(concept, concept.variante, { maintenant, fuseau }),
  );

  return {
    fuseau,
    questions,
    totalConcepts,
    conceptsEnAttenteDeQuestions: enAttente,
    prochainJourServi: prochainJourServi(prochain, maintenant, fuseau),
    reporteAuLendemain: dus - questions.length,
  };
}

/** `lastReview` n'est écrit que par la session, jamais par l'entraînement. */
export async function compterFaitsAujourdhui(
  userId: string,
  maintenant: Date,
  fuseau: string,
): Promise<number> {
  const jour = jourLocal(maintenant, fuseau);
  const passes = await prisma.atom.findMany({
    where: { userId, lastReview: { gte: new Date(maintenant.getTime() - MARGE_MS) } },
    select: { lastReview: true },
  });

  return passes.filter((atome) => atome.lastReview && jourLocal(atome.lastReview, fuseau) === jour)
    .length;
}

/**
 * Pas la plus petite échéance : revu ce matin, un concept peut être dû encore
 * aujourd'hui (ts-fsrs replanifie court en apprentissage) et revenir demain.
 */
function prochainJourServi(
  concepts: { due: Date; lastReview: Date | null }[],
  maintenant: Date,
  fuseau: string,
): string | null {
  return concepts.map((concept) => jourOuIlRevient(concept, maintenant, fuseau)).sort()[0] ?? null;
}

/** Le chiffre du tableau de bord, par `estServableAujourdhui` : une seule définition de « dû ». */
export async function compterDusAujourdhui(
  userId: string,
  maintenant: Date = new Date(),
): Promise<number> {
  const fuseau = await lireFuseauUtilisateur(userId);

  const candidats = await prisma.atom.findMany({
    where: {
      userId,
      uncertain: false,
      variants: { some: { retiredAt: null } },
      due: { lte: new Date(maintenant.getTime() + MARGE_MS) },
    },
    select: { due: true, lastReview: true },
  });

  return candidats.filter((atome) => estServableAujourdhui(atome, maintenant, fuseau)).length;
}

/** Partagé par le tableau de bord et la page d'un dépôt : une seule charge du jour. */
export async function lireChargeDuJour(
  userId: string,
  maintenant: Date = new Date(),
): Promise<{ charge: ChargeDuJour; plafond: number; faitsAujourdhui: number; fuseau: string }> {
  const cadre = await lireCadreDeSession(userId);
  const [dus, faitsAujourdhui] = await Promise.all([
    compterDusAujourdhui(userId, maintenant),
    compterFaitsAujourdhui(userId, maintenant, cadre.fuseau),
  ]);

  return {
    charge: chargeDuJour(dus, plafondRestant(cadre.plafond, faitsAujourdhui)),
    plafond: cadre.plafond,
    faitsAujourdhui,
    fuseau: cadre.fuseau,
  };
}

/**
 * À lire après la session, qui vient de déplacer les échéances. Inclut le dû
 * du jour au-delà du plafond : il ne repassera pas avant demain.
 */
export async function compterDusDemain(
  userId: string,
  maintenant: Date = new Date(),
): Promise<number> {
  const { fuseau, plafond } = await lireCadreDeSession(userId);
  const demain = jourSuivant(jourLocal(maintenant, fuseau));

  const candidats = await prisma.atom.findMany({
    where: {
      userId,
      uncertain: false,
      variants: { some: { retiredAt: null } },
      // Pas de borne basse : elle écarterait les retards, qui reviennent demain.
      due: { lte: new Date(maintenant.getTime() + 2 * MARGE_MS) },
    },
    select: { due: true, lastReview: true },
  });

  const reste = plafondRestant(plafond, await compterFaitsAujourdhui(userId, maintenant, fuseau));
  const dusAujourdhui = candidats.filter((atome) =>
    estServableAujourdhui(atome, maintenant, fuseau),
  ).length;

  return (
    candidats.filter((atome) => jourOuIlRevient(atome, maintenant, fuseau) === demain).length +
    Math.max(0, dusAujourdhui - reste)
  );
}
