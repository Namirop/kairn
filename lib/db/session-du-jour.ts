import { prisma } from "@/lib/db/client";
import { questionServie, type QuestionServie } from "@/lib/db/question-servie";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { jourSuivant, localDay } from "@/lib/domain/local-day";
import { choisirVariante } from "@/lib/domain/rotation-variantes";
import { composerSession, jourOuIlRevient } from "@/lib/domain/selection-session";

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
  /** De quoi distinguer les trois écrans vides sans deviner. */
  totalConcepts: number;
  conceptsEnAttenteDeQuestions: number;
  /** Jour civil du prochain passage, au format AAAA-MM-JJ. */
  prochainJourServi: string | null;
};

export async function lireSessionDuJour(
  userId: string,
  maintenant: Date = new Date(),
): Promise<SessionDuJour> {
  const fuseau = await lireFuseauUtilisateur(userId);

  const [candidats, totalConcepts, enAttente, prochain] = await Promise.all([
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
  ]);

  const retenus = composerSession(candidats, maintenant, fuseau);
  const questions: QuestionServie[] = [];

  for (const atome of retenus) {
    const derniereFacette = atome.reviews[0]?.variant.facet ?? null;
    const servie = choisirVariante(atome.variants, derniereFacette);

    // Écarté par la requête en principe ; on ne pose pas une carte vide au cas où.
    if (!servie) continue;

    const variante = atome.variants.find((candidate) => candidate.id === servie.id);

    if (!variante) continue;

    questions.push(questionServie(atome, variante));
  }

  return {
    fuseau,
    questions,
    totalConcepts,
    conceptsEnAttenteDeQuestions: enAttente,
    prochainJourServi: prochainJourServi(prochain, maintenant, fuseau),
  };
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
 * Ce qui revient demain, dans le calendrier de l'utilisateur.
 *
 * Lu après la session et non avant : les notes qu'on vient de donner ont
 * déplacé les échéances, et annoncer le chiffre d'avant serait annoncer faux.
 */
export async function compterDusDemain(
  userId: string,
  maintenant: Date = new Date(),
): Promise<number> {
  const fuseau = await lireFuseauUtilisateur(userId);
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

  return candidats.filter((atome) => jourOuIlRevient(atome, maintenant, fuseau) === demain).length;
}
