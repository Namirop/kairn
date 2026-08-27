import { prisma } from "@/lib/db/client";

/**
 * Ce qu'une visite sans compte a produit, et ce qu'il en advient.
 *
 * Séparé du verrou : `session-anonyme.ts` décide qui a le droit de déposer,
 * ce fichier-ci s'occupe de ce qui en sort — le lire pour l'afficher, le
 * rattacher à un compte quand il y en a un, l'effacer quand il n'y en aura
 * jamais. Deux décisions différentes, et deux moments différents.
 */

/**
 * Au-delà, un dépôt anonyme que personne n'a réclamé n'intéresse plus personne.
 *
 * Assez long pour qu'on revienne le lendemain finir ce qu'on a commencé, assez
 * court pour ne pas garder indéfiniment le texte de quelqu'un qui n'a jamais
 * créé de compte — et qui n'a donc accepté aucune conservation.
 */
export const JOURS_AVANT_OUBLI = 7;

export type DepotAnonyme = {
  inputId: string;
  statut: string;
  motifDechec: string | null;
  concepts: { id: string; concept: string; tags: string[] }[];
  /**
   * La question écrite sur le premier concept **questionnable**, quand elle est là.
   *
   * Le premier tout court n'est pas forcément celui-là : sur un dépôt factuel,
   * les concepts incertains sont écartés du questionnement, et un dépôt dont
   * ils le sont tous n'en reçoit aucune. `null` est alors une fin normale.
   */
  question: string | null;
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
          // Un visiteur n'en a qu'une, sur le premier concept questionnable.
          // `take: 1` par sécurité plutôt que par attente : si la règle changeait
          // un jour, l'écran n'en montrerait toujours qu'une au lieu de s'allonger
          // sans que personne l'ait décidé.
          variants: { orderBy: { createdAt: "asc" }, select: { question: true }, take: 1 },
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
    question: depot.atoms.flatMap((atome) => atome.variants)[0]?.question ?? null,
  };
}

/**
 * Rattache à un compte ce qu'une session anonyme a produit.
 *
 * Tout se joue dans une transaction : un dépôt qui passerait au compte sans ses
 * concepts, ou l'inverse, laisserait quelqu'un devant une liste vide en lui
 * disant qu'elle est à lui. La session est marquée réclamée dans le même
 * mouvement, ce qui la met hors de portée du cron de nettoyage.
 *
 * Rend les concepts **groupés par leur dépôt d'origine**, et non à plat. Une
 * visite en porte jusqu'à quatre, et le cas courant est le pire : premier dépôt
 * rejeté, second réussi. À plat, l'appelant prenait `inputIds[0]` — le dépôt
 * **rejeté** — et lui accrochait les concepts du second. Les questions
 * atterrissaient sur les bons concepts, mais sous un dépôt en `REJECTED` que
 * `marquerPretSiPlusRienEnAttente` refuse de refermer : une incohérence qui
 * dormait jusqu'à la première fonctionnalité lisant les jobs par dépôt.
 *
 * C'est à l'appelant de demander les questions, parce que c'est **là** que la
 * dépense reprend, et qu'elle doit se voir dans le code qui décide.
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

  /*
    Un essai qui n'a rien donné ne suit pas au compte.

    Le cas courant d'une visite est « premier dépôt rejeté, second réussi » :
    on écrit n'importe quoi pour voir, la landing répond que rien n'est à
    retenir, et on redépose pour de bon. Le premier a déjà rendu son verdict à
    l'écran, sur place. Le porter au compte revient à ouvrir la liste de
    quelqu'un sur son brouillon raté, avec « RIEN À RETENIR » pour seule
    ligne — et rien ne pourra jamais le remplir, puisqu'un dépôt rejeté est
    terminal.

    **Terminal et vide**, les deux : un dépôt sans concept dont l'extraction
    tourne encore est un dépôt qui n'a pas fini, pas un dépôt qui a échoué.
    Le supprimer emporterait le job qui allait le remplir.

    Suppression et non abandon sur place : la session est marquée réclamée
    juste après, ce qui la met hors de portée du cron de nettoyage. Ce qu'on
    n'emporte pas ici ne serait ramassé par personne.

    Hors de la transaction qui suit, et c'est sans risque : elle est là pour
    qu'un dépôt n'arrive jamais au compte sans ses concepts, or ceux-ci n'en
    ont pas. Si le rattachement échouait derrière, on n'aurait perdu que des
    lignes qui n'avaient rien à perdre.
  */
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
 * Efface les visites que personne n'a réclamées.
 *
 * Les cascades emportent le dépôt et ses concepts. C'est une obligation autant
 * qu'un ménage : quelqu'un qui n'a jamais créé de compte n'a accepté aucune
 * conservation, et son texte n'a pas à rester.
 */
export async function oublierLesVisitesAbandonnees(maintenant: Date = new Date()): Promise<number> {
  const limite = new Date(maintenant.getTime() - JOURS_AVANT_OUBLI * 24 * 60 * 60 * 1000);

  const { count } = await prisma.anonymousSession.deleteMany({
    where: { claimedAt: null, createdAt: { lt: limite } },
  });

  return count;
}
