import { prisma } from "@/lib/db/client";
import { questionServie, type QuestionServie } from "@/lib/db/question-servie";
import { lireCadreDeSession, lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { jourSuivant, localDay } from "@/lib/domain/local-day";
import { composerLaJournee } from "@/lib/domain/journee-de-session";
import {
  chargeDuJour,
  estServableAujourdhui,
  jourOuIlRevient,
  plafondRestant,
  type ChargeDuJour,
} from "@/lib/domain/selection-session";

/**
 * Ce qu'il y a à réviser maintenant. La requête ramène un peu large ; ce sont
 * les fonctions pures de `lib/domain/` qui tranchent ce qui est dû, dans quel
 * ordre et sous quelle formulation.
 */

/**
 * Marge de la présélection SQL. Le jour civil de l'utilisateur finit au plus
 * tard dans un peu moins de 24 h ; 36 h couvrent les fuseaux extrêmes et les
 * changements d'heure, et `estServableAujourdhui` fait le tri exact.
 */
const MARGE_MS = 36 * 60 * 60 * 1000;

export type SessionDuJour = {
  fuseau: string;
  questions: QuestionServie[];
  /** De quoi distinguer les écrans vides sans deviner. */
  totalConcepts: number;
  conceptsEnAttenteDeQuestions: number;
  /** Jour civil du prochain passage, au format AAAA-MM-JJ. */
  prochainJourServi: string | null;
  /**
   * Ce qui est dû mais dépasse le plafond, zéro sinon. Distingue « tu es à
   * jour » de « tu as fait ta journée ».
   */
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
        // Un concept douteux n'a aucune question écrite dessus : il attend une
        // décision de l'utilisateur, il n'attend pas d'être révisé.
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
        // L'intervalle promis : c'est lui qui dit si le retard est grave.
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

  // Le plafond est journalier : ce qui a déjà été revu aujourd'hui en fait partie.
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

/**
 * Combien de concepts la journée a déjà servis. `lastReview` n'est écrit que
 * par la session, jamais par l'entraînement : c'est le compte qui entre dans
 * le plafond.
 */
export async function compterFaitsAujourdhui(
  userId: string,
  maintenant: Date,
  fuseau: string,
): Promise<number> {
  const jour = localDay(maintenant, fuseau);
  const passes = await prisma.atom.findMany({
    where: { userId, lastReview: { gte: new Date(maintenant.getTime() - MARGE_MS) } },
    select: { lastReview: true },
  });

  return passes.filter((atome) => atome.lastReview && localDay(atome.lastReview, fuseau) === jour)
    .length;
}

/**
 * Le prochain jour où quelque chose sera posé. Pas la plus petite échéance : un
 * concept revu ce matin peut porter une échéance encore aujourd'hui (ts-fsrs
 * replanifie court en apprentissage) et ne reviendra pourtant que demain.
 */
function prochainJourServi(
  concepts: { due: Date; lastReview: Date | null }[],
  maintenant: Date,
  fuseau: string,
): string | null {
  return concepts.map((concept) => jourOuIlRevient(concept, maintenant, fuseau)).sort()[0] ?? null;
}

/**
 * Combien de concepts la session servirait maintenant : le chiffre du tableau
 * de bord. Il passe par `estServableAujourdhui` pour qu'il n'existe qu'une
 * définition de « est dû ».
 */
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

/**
 * Ce que la journée sert et ce qu'elle reporte. Partagé par le tableau de bord
 * et la page d'un dépôt, pour une seule définition de la charge du jour.
 */
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
 * Ce qui revient demain, dans le calendrier de l'utilisateur. À lire après la
 * session : les notes données viennent de déplacer les échéances.
 *
 * Ce qui reste dû aujourd'hui au-delà du plafond en fait partie : il ne
 * repassera pas avant demain.
 */
export async function compterDusDemain(
  userId: string,
  maintenant: Date = new Date(),
): Promise<number> {
  const { fuseau, plafond } = await lireCadreDeSession(userId);
  const demain = jourSuivant(localDay(maintenant, fuseau));

  const candidats = await prisma.atom.findMany({
    where: {
      userId,
      uncertain: false,
      variants: { some: { retiredAt: null } },
      // Borne haute seulement : une borne basse écarterait les concepts en
      // retard, qui reviennent pourtant demain.
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
