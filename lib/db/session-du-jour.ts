import { prisma } from "@/lib/db/client";
import { questionServie, type QuestionServie } from "@/lib/db/question-servie";
import { lireCadreDeSession, lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { gesteDeReponse } from "@/lib/domain/geste-de-reponse";
import { jourSuivant, localDay } from "@/lib/domain/local-day";
import { choisirVariante } from "@/lib/domain/rotation-variantes";
import {
  composerSession,
  estServableAujourdhui,
  jourOuIlRevient,
  plafondRestant,
} from "@/lib/domain/selection-session";

/**
 * Ce qu'il y a à réviser maintenant.
 *
 * La requête ne décide rien : elle ramène un peu plus large que nécessaire, et
 * ce sont les fonctions pures de `lib/domain/` qui tranchent ce qui est dû, dans
 * quel ordre, et quelle formulation servir. La vérité du produit est testable
 * sans base ; la base ne fait que la nourrir.
 */

/**
 * Marge de la présélection SQL.
 *
 * Le jour civil de l'utilisateur se termine au plus tard dans un peu moins de
 * 24 h, quel que soit son décalage. On ramène 36 h pour n'avoir à réfléchir ni
 * aux fuseaux extrêmes ni aux changements d'heure, puis `composerSession` fait
 * le tri exact.
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
   * Ce qui est dû et que la journée ne servira pas : le plafond est atteint.
   *
   * Zéro dans tous les autres cas, y compris quand rien n'est dû. C'est ce qui
   * distingue « tu es à jour » de « tu as fait ta journée », deux écrans vides qui
   * n'ont ni le même sens ni la même suite.
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
      // Le prochain jour servi est parmi les plus proches échéances : inutile de
      // ramener un historique entier pour trouver un minimum.
      take: 50,
    }),
    compterFaitsAujourdhui(userId, maintenant, fuseau),
  ]);

  // Le plafond est journalier : ce qui a déjà été revu aujourd'hui en fait partie.
  const reste = plafondRestant(plafond, faits);

  // La variante est choisie **avant** de composer, et c'est ce qui permet à
  // l'ordre de service de tenir compte du geste : il dépend du format servi, donc
  // il n'existe pas tant que la formulation n'est pas arrêtée. Le choix est une
  // opération en mémoire, la faire sur tous les candidats plutôt que sur les
  // retenus ne coûte rien.
  const servables = candidats.flatMap((atome) => {
    const derniereFacette = atome.reviews[0]?.variant.facet ?? null;
    const servie = choisirVariante(atome.variants, derniereFacette);

    // Écarté par la requête en principe ; on ne pose pas une carte vide au cas où.
    if (!servie) return [];

    const variante = atome.variants.find((candidate) => candidate.id === servie.id);

    return variante ? [{ ...atome, variante }] : [];
  });

  const dus = servables.filter((concept) => estServableAujourdhui(concept, maintenant, fuseau));
  const retenus = composerSession(servables, maintenant, fuseau, reste, (concept) =>
    gesteDeReponse(concept.variante.format),
  );

  const questions = retenus.map((concept) =>
    questionServie(concept, concept.variante, { maintenant, fuseau }),
  );

  return {
    fuseau,
    questions,
    totalConcepts,
    conceptsEnAttenteDeQuestions: enAttente,
    prochainJourServi: prochainJourServi(prochain, maintenant, fuseau),
    reporteAuLendemain: dus.length - questions.length,
  };
}

/**
 * Combien de concepts la journée a déjà servis, chez l'utilisateur.
 *
 * `lastReview` est écrit par la session et par elle seule — l'entraînement libre
 * ne le touche pas —, donc c'est exactement le compte qui doit entrer dans le
 * plafond. La borne SQL est large et le jour se compare en mémoire, comme partout.
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
 * Le prochain jour où quelque chose sera effectivement posé.
 *
 * Ce n'est pas la plus petite échéance en base : un concept revu ce matin porte
 * une échéance encore aujourd'hui — ts-fsrs replanifie court en apprentissage —
 * et ne reviendra pourtant que demain. Annoncer son échéance produisait la
 * phrase « rien n'arrive aujourd'hui, le prochain revient aujourd'hui ».
 */
function prochainJourServi(
  concepts: { due: Date; lastReview: Date | null }[],
  maintenant: Date,
  fuseau: string,
): string | null {
  return concepts.map((concept) => jourOuIlRevient(concept, maintenant, fuseau)).sort()[0] ?? null;
}

/**
 * Combien de concepts la session servirait maintenant.
 *
 * C'est le chiffre qu'annonce le tableau de bord, et il doit venir d'ici : le
 * compter à part revenait à avoir deux définitions de « est dû », et elles
 * avaient déjà divergé — l'accueil promettait cinq concepts, la session
 * répondait « tu es à jour ». La règle est dans `estServableAujourdhui`, et
 * elle n'a qu'un seul endroit où vivre.
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
 * Ce qui revient demain, dans le calendrier de l'utilisateur.
 *
 * Lu après la session et non avant : les notes qu'on vient de donner ont
 * déplacé les échéances, et annoncer le chiffre d'avant serait annoncer faux.
 *
 * Ce qui est resté dû aujourd'hui en fait partie. Le plafond étant journalier, un
 * concept que la journée n'a pas servi ne repassera pas avant demain : l'annoncer
 * pour aujourd'hui serait promettre une session qui ne viendra pas.
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
      // Borne haute seulement. Une borne basse écarterait les concepts en
      // retard — quatre jours de retard, et le concept sortait de la fenêtre
      // alors qu'il revient bien demain. Le retard accumulé est justement le
      // cas où ce chiffre compte le plus.
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
