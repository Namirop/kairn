import { prisma } from "@/lib/db/client";
import { optionsDUnQCM, texteATrouServi } from "@/lib/db/question-servie";
import type { InputNature, VariantFormat } from "@/lib/db/types";

/**
 * Ce qu'une visite sans compte a produit : le lire, le rattacher à un compte,
 * l'effacer. Le droit de déposer se décide dans `session-anonyme.ts`. Un dépôt
 * anonyme est un `Input` qui porte `anonymousSessionId` au lieu d'un `userId`.
 */

/**
 * Égale à la durée du cookie (`lib/auth/visite.ts`) : un cookie plus long
 * désignerait un dépôt effacé. Les deux se changent ensemble.
 */
export const JOURS_AVANT_OUBLI = 7;

export type DepotAnonyme = {
  inputId: string;
  statut: string;
  motifDechec: string | null;
  concepts: { id: string; concept: string; tags: string[] }[];
  /**
   * Toutes montrées : la rotation des formulations est ce qu'on vend. Un
   * concept incertain n'en reçoit pas ; un tableau vide est une fin normale.
   */
  questions: QuestionDeVitrine[];
};

/** La bonne réponse d'un QCM ne descend pas — voir `optionsDUnQCM`. */
export type QuestionDeVitrine = {
  question: string;
  format: VariantFormat;
  options: string[] | null;
};

/** Ce qu'une session a produit, pour l'afficher à qui vient de déposer. */
export async function lireLeDepotAnonyme(sessionId: string): Promise<DepotAnonyme | null> {
  const depot = await prisma.input.findFirst({
    where: { anonymousSessionId: sessionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      failureReason: true,
      atoms: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          concept: true,
          tags: true,
          // Quatre par lot ; borné pour que l'écran ne s'allonge pas si ça monte.
          variants: {
            orderBy: { createdAt: "asc" },
            select: { question: true, format: true, payload: true },
            take: 4,
          },
        },
      },
    },
  });

  if (!depot) return null;

  return {
    inputId: depot.id,
    statut: depot.status,
    motifDechec: depot.failureReason,
    concepts: depot.atoms.map(({ id, concept, tags }) => ({ id, concept, tags })),
    questions: depot.atoms.flatMap((atome) =>
      atome.variants.map((variante) => ({
        // Un texte à trou se montre tel qu'il sera servi en session.
        question: texteATrouServi(variante.format, variante.payload)?.sentence ?? variante.question,
        format: variante.format,
        options: optionsDUnQCM(variante.format, variante.payload),
      })),
    ),
  };
}

export type DepotRepris = {
  inputId: string;
  nature: InputNature | null;
  concepts: ConceptRepris[];
};

/**
 * `dejaQuestionne` : questions déjà faites ou en cours. Les redemander paierait
 * un appel pour retirer celles que la personne vient de voir.
 */
export type ConceptRepris = { id: string; uncertain: boolean; dejaQuestionne: boolean };

/**
 * Dépôts, concepts et `claimedAt` dans une même transaction : un dépôt sans ses
 * concepts serait une liste vide, et la marque soustrait la session au cron.
 * Groupé par dépôt : un job accroché au mauvais dépôt ne serait jamais refermé
 * par `marquerPretSiPlusRienEnAttente`. L'appelant demande les questions : la
 * dépense doit se voir dans le code qui décide.
 */
export async function rattacherAuCompte(
  sessionId: string,
  userId: string,
  maintenant: Date = new Date(),
): Promise<DepotRepris[]> {
  const session = await prisma.anonymousSession.findUnique({
    where: { id: sessionId },
    select: { claimedAt: true },
  });

  // Déjà réclamée : deux onglets, ou un rechargement. Le premier a gagné.
  if (!session || session.claimedAt !== null) return [];

  const tous = await prisma.input.findMany({
    where: { anonymousSessionId: sessionId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      nature: true,
      atoms: {
        select: {
          id: true,
          uncertain: true,
          _count: { select: { variants: { where: { retiredAt: null } } } },
        },
      },
      jobs: { where: { kind: "VARIANTS" }, select: { atomIds: true } },
    },
  });

  // Un essai terminal et vide ne suit pas : son verdict est déjà rendu, il
  // ouvrirait la liste sur une ligne vide (sans concept mais en extraction, il
  // n'a pas fini). Supprimé, car le cron ignore une session réclamée ; hors
  // transaction sans risque, il n'a pas de concepts à perdre.
  const perdus = tous
    .filter(
      (depot) =>
        depot.atoms.length === 0 && (depot.status === "REJECTED" || depot.status === "FAILED"),
    )
    .map((depot) => depot.id);
  const depots = tous.filter((depot) => !perdus.includes(depot.id));

  if (perdus.length > 0) {
    await prisma.input.deleteMany({ where: { id: { in: perdus } } });
  }

  if (depots.length === 0) {
    await prisma.anonymousSession.update({
      where: { id: sessionId },
      data: { claimedAt: maintenant },
    });

    return [];
  }

  await prisma.$transaction([
    prisma.input.updateMany({
      where: { id: { in: depots.map((depot) => depot.id) } },
      data: { userId, anonymousSessionId: null },
    }),
    prisma.atom.updateMany({
      where: { anonymousSessionId: sessionId },
      data: { userId, anonymousSessionId: null },
    }),
    prisma.anonymousSession.update({
      where: { id: sessionId },
      data: { claimedAt: maintenant },
    }),
  ]);

  return depots.map((depot) => ({
    inputId: depot.id,
    nature: depot.nature,
    concepts: depot.atoms.map((atome) => ({
      id: atome.id,
      uncertain: atome.uncertain,
      dejaQuestionne:
        atome._count.variants > 0 || depot.jobs.some((job) => job.atomIds.includes(atome.id)),
    })),
  }));
}

/** Dépôts emportés par cascade. Une obligation : sans compte, nul n'a accepté de conservation. */
export async function oublierLesVisitesAbandonnees(maintenant: Date = new Date()): Promise<number> {
  const limite = new Date(maintenant.getTime() - JOURS_AVANT_OUBLI * 24 * 60 * 60 * 1000);

  const { count } = await prisma.anonymousSession.deleteMany({
    where: { claimedAt: null, createdAt: { lt: limite } },
  });

  return count;
}
