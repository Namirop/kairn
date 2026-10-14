import { prisma } from "@/lib/db/client";
import { optionsDUnQCM, texteATrouServi } from "@/lib/db/question-servie";
import type { VariantFormat } from "@/lib/db/types";

/**
 * Ce qu'une visite sans compte a produit : le lire pour l'afficher, le rattacher
 * à un compte, l'effacer quand personne ne le réclame. Qui a le droit de déposer
 * se décide dans `session-anonyme.ts`.
 *
 * Le dépôt anonyme est un `Input` ordinaire qui porte `anonymousSessionId` au
 * lieu d'un `userId` ; l'identifiant de session vit dans le cookie
 * `kairn_visite`. Le cron `/api/cron/jobs` efface les sessions non réclamées,
 * et les cascades emportent dépôts et concepts.
 */

/**
 * Durée de conservation d'une visite non réclamée. Égale à celle du cookie
 * (`lib/auth/visite.ts`) : un cookie qui survivrait à la session désignerait un
 * dépôt effacé, et la page refuserait l'essai de qui revient trop tard. Les deux
 * se changent ensemble.
 */
export const JOURS_AVANT_OUBLI = 7;

export type DepotAnonyme = {
  inputId: string;
  statut: string;
  motifDechec: string | null;
  concepts: { id: string; concept: string; tags: string[] }[];
  /**
   * Les questions du concept qui en a reçu, toutes montrées : la rotation des
   * formulations est ce qu'on vend. Ce n'est pas forcément le premier concept
   * (les incertains n'en reçoivent pas), et un tableau vide est une fin normale.
   */
  questions: QuestionDeVitrine[];
};

/**
 * Une question de l'échantillon, avec ses propositions quand c'est un QCM. La
 * bonne réponse ne descend pas — voir `optionsDUnQCM`.
 */
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
          // Un lot porte quatre questions ; `take: 4` empêche l'écran de
          // s'allonger seul si ce nombre montait.
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
        // Un texte à trou se montre tel qu'il sera servi en session — voir
        // `texteATrouServi`.
        question: texteATrouServi(variante.format, variante.payload)?.sentence ?? variante.question,
        format: variante.format,
        options: optionsDUnQCM(variante.format, variante.payload),
      })),
    ),
  };
}

/**
 * Rattache à un compte ce qu'une session anonyme a produit.
 *
 * Dépôts, concepts et marque `claimedAt` passent dans une même transaction : un
 * dépôt sans ses concepts serait une liste vide présentée comme la sienne, et
 * la marque met la session hors de portée du cron de nettoyage.
 *
 * Rend les concepts groupés par dépôt d'origine : une visite en porte plusieurs,
 * et accrocher les jobs de questions au mauvais dépôt laisserait celui-ci dans
 * un état que `marquerPretSiPlusRienEnAttente` ne referme jamais.
 *
 * C'est à l'appelant de demander les questions : la dépense reprend là, et doit
 * se voir dans le code qui décide.
 */
export type DepotRepris = { inputId: string; atomIds: string[] };

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
    select: { id: true, status: true, atoms: { select: { id: true } } },
  });

  // Un essai terminal et vide ne suit pas au compte : son verdict a déjà été
  // rendu à l'écran, et il ouvrirait la liste sur une ligne que rien ne
  // remplira. Terminal et vide, les deux : un dépôt sans concept encore en
  // extraction n'a pas fini. On le supprime plutôt que de l'abandonner, car une
  // session réclamée échappe au cron de nettoyage. Hors transaction sans risque :
  // ces dépôts n'ont pas de concepts à perdre.
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
    atomIds: depot.atoms.map((atome) => atome.id),
  }));
}

/**
 * Efface les visites que personne n'a réclamées, avec leurs dépôts par cascade.
 * C'est une obligation autant qu'un ménage : sans compte, aucune conservation
 * n'a été acceptée.
 */
export async function oublierLesVisitesAbandonnees(maintenant: Date = new Date()): Promise<number> {
  const limite = new Date(maintenant.getTime() - JOURS_AVANT_OUBLI * 24 * 60 * 60 * 1000);

  const { count } = await prisma.anonymousSession.deleteMany({
    where: { claimedAt: null, createdAt: { lt: limite } },
  });

  return count;
}
