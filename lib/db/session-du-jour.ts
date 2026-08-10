import { z } from "zod";
import { prisma } from "@/lib/db/client";
import type { VariantFacet, VariantFormat } from "@/lib/db/types";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { choixDUnVraiOuFaux } from "@/lib/domain/choix-proposes";
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

/** Les options d'un QCM, telles que la génération les a écrites. */
const PAYLOAD_CHOIX = z.object({
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
});

/** Ce qu'un vrai ou faux pose à côté de sa question, quand il pose quelque chose. */
const PAYLOAD_VRAI_FAUX = z.object({ expected: z.boolean() });

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
  /** Jour civil du prochain passage, au format AAAA-MM-JJ. */
  prochainJourServi: string | null;
};

/**
 * Les choix à proposer, ou `null` si la question doit repartir en format ouvert.
 *
 * Un vrai ou faux ne porte pas d'options en base : ce sont toujours les deux
 * mêmes, et c'est le domaine qui les reconstruit. Sans ce passage, un vrai ou
 * faux tombait côté ouvert et demandait à l'utilisateur de se juger sur une
 * question dont la justesse est pourtant connue.
 */
function lireChoix(
  format: VariantFormat,
  payload: unknown,
  answerKey: string,
): { options: string[]; correctIndex: number } | null {
  if (format === "TRUE_FALSE") {
    const attendu = PAYLOAD_VRAI_FAUX.safeParse(payload);

    return choixDUnVraiOuFaux(attendu.success ? attendu.data.expected : null, answerKey);
  }

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
  const questions: QuestionDeSession[] = [];

  for (const atome of retenus) {
    const derniereFacette = atome.reviews[0]?.variant.facet ?? null;
    const servie = choisirVariante(atome.variants, derniereFacette);

    // Écarté par la requête en principe ; on ne pose pas une carte vide au cas où.
    if (!servie) continue;

    const variante = atome.variants.find((candidate) => candidate.id === servie.id);

    if (!variante) continue;

    const choix = lireChoix(variante.format, variante.payload, variante.answerKey);

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
