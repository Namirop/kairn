import { prisma } from "@/lib/db/client";
import { questionServie, type QuestionServie } from "@/lib/db/question-servie";
import { lireCadreDeSession, lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { gesteDeReponse } from "@/lib/domain/geste-de-reponse";
import { jourSuivant, localDay } from "@/lib/domain/local-day";
import { questionServable } from "@/lib/domain/question-servable";
import { repartirLesFormats } from "@/lib/domain/repartition-des-formats";
import { variantesEquivalentes } from "@/lib/domain/rotation-variantes";
import { alternerLesSujets } from "@/lib/domain/alternance-des-sujets";
import {
  chargeDuJour,
  conceptsDeLaJournee,
  estServableAujourdhui,
  jourOuIlRevient,
  plafondRestant,
  type ChargeDuJour,
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

  /*
    La journée est composée **avant** que les formulations soient choisies.

    Trois décisions ne regardent pas la formulation — ce qui est dû, dans quel
    ordre d'urgence, et jusqu'où le plafond va. On les prend donc en premier,
    et la répartition des formats porte ensuite sur exactement les concepts que
    la session posera.

    C'est le défaut qui a fait revenir trois QCM d'affilée après la première
    correction : la requête ramène trente-six heures d'avance, et répartir les
    formats sur tous les candidats faisait consommer des QCM et des textes à
    trou par des concepts dus **demain**. Les questions réellement posées
    héritaient d'un compteur déjà déséquilibré.

    L'ordre passé au répartiteur est celui des identifiants et non celui de
    l'urgence : le glouton en dépend, et une session qui se recompose doit se
    recomposer à l'identique.
  */
  const proposables = candidats.flatMap((atome) => {
    // Une formulation sans texte ni réponse ne se pose pas : elle donnerait une
    // carte blanche. La requête ne sait pas le dire — un `not: ""` laisserait
    // passer une espace —, donc le tri se fait ici, comme le reste des règles.
    const equivalentes = variantesEquivalentes(
      atome.variants.filter(questionServable),
      atome.reviews[0]?.variant.facet ?? null,
    );

    return equivalentes.length > 0 ? [{ ...atome, equivalentes }] : [];
  });

  const dus = proposables.filter((concept) => estServableAujourdhui(concept, maintenant, fuseau));
  const retenus = conceptsDeLaJournee(proposables, maintenant, fuseau, reste);

  const ordreStable = [...retenus].sort((une, deux) => une.id.localeCompare(deux.id));
  const choisies = repartirLesFormats(ordreStable.map((concept) => concept.equivalentes));
  const parConcept = new Map(ordreStable.map((concept, rang) => [concept.id, choisies[rang]]));

  const servis = alternerLesSujets(
    retenus.flatMap((concept) => {
      const variante = parConcept.get(concept.id);

      // Écarté plus haut en principe ; on ne pose pas une carte vide au cas où.
      return variante ? [{ ...concept, variante }] : [];
    }),
    (concept) => gesteDeReponse(concept.variante.format),
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
 * Ce que la journée sert et ce qu'elle reporte, avec de quoi le dire.
 *
 * Le tableau de bord composait ces quatre valeurs lui-même. Un second écran en a
 * eu besoin — la page d'un dépôt, qui dit ce que les concepts qu'on vient
 * d'obtenir changent à la journée —, et recomposer la même chose ailleurs, c'est
 * se donner deux définitions de la charge du jour. Elles divergent toujours.
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
