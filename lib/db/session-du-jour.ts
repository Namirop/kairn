import { z } from "zod";
import { prisma } from "@/lib/db/client";
import type { VariantFacet, VariantFormat } from "@/lib/db/types";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { jourSuivant, localDay } from "@/lib/domain/local-day";
import { choisirVariante } from "@/lib/domain/rotation-variantes";
import { composerSession } from "@/lib/domain/selection-session";

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

/** Les options d'un QCM, telles que la génération les a écrites. */
const PAYLOAD_CHOIX = z.object({
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
});

export type QuestionDeSession = {
  atomId: string;
  concept: string;
  tags: string[];
  variantId: string;
  format: VariantFormat;
  facet: VariantFacet;
  question: string;
  /** L'étalon montré après coup sur un format ouvert. */
  answerKey: string;
  options: string[] | null;
  correctIndex: number | null;
};

export type SessionDuJour = {
  fuseau: string;
  questions: QuestionDeSession[];
  /** De quoi distinguer les trois écrans vides sans deviner. */
  totalConcepts: number;
  conceptsEnAttenteDeQuestions: number;
  prochaineEcheance: Date | null;
};

function lireChoix(payload: unknown): { options: string[]; correctIndex: number } | null {
  const lu = PAYLOAD_CHOIX.safeParse(payload);

  if (!lu.success) return null;
  // Un index hors des options viendrait d'une génération abîmée : mieux vaut
  // servir la question sans ses choix que proposer une bonne réponse fausse.
  if (lu.data.correctIndex >= lu.data.options.length) return null;

  return lu.data;
}

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
        variants: {
          where: { retiredAt: null },
          select: {
            id: true,
            format: true,
            facet: true,
            question: true,
            answerKey: true,
            payload: true,
            seenCount: true,
            lastSeenAt: true,
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
    prisma.atom.findFirst({
      where: { userId, uncertain: false, variants: { some: { retiredAt: null } } },
      orderBy: { due: "asc" },
      select: { due: true },
    }),
  ]);

  const retenus = composerSession(candidats, maintenant, fuseau);
  const questions: QuestionDeSession[] = [];

  for (const atome of retenus) {
    const derniereFacette = atome.reviews[0]?.variant.facet ?? null;
    const servie = choisirVariante(atome.variants, derniereFacette);

    // Écarté par la requête en principe ; on ne pose pas une carte vide au cas où.
    if (!servie) continue;

    const variante = atome.variants.find((candidate) => candidate.id === servie.id);

    if (!variante) continue;

    const choix = lireChoix(variante.payload);

    questions.push({
      atomId: atome.id,
      concept: atome.concept,
      tags: atome.tags,
      variantId: variante.id,
      format: variante.format,
      facet: variante.facet,
      question: variante.question,
      answerKey: variante.answerKey,
      options: choix?.options ?? null,
      correctIndex: choix?.correctIndex ?? null,
    });
  }

  return {
    fuseau,
    questions,
    totalConcepts,
    conceptsEnAttenteDeQuestions: enAttente,
    prochaineEcheance: prochain?.due ?? null,
  };
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
      // Deux fois la marge : le lendemain de l'utilisateur se termine au plus
      // tard un peu avant 48 h d'ici, quel que soit son décalage.
      due: { gte: maintenant, lte: new Date(maintenant.getTime() + 2 * MARGE_MS) },
    },
    select: { due: true },
  });

  return candidats.filter((atome) => localDay(atome.due, fuseau) === demain).length;
}
