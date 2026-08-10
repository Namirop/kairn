import { prisma } from "@/lib/db/client";
import type { Input } from "@/lib/db/types";

/**
 * Les écritures du pipeline d'ingestion, de la création du dépôt à son état
 * final.
 *
 * Rien n'est jeté de ce qui a coûté un appel : un dépôt dont l'extraction a
 * abouti garde ses concepts même si les questions échouent ensuite.
 */

export type DepotADeposer = {
  userId: string;
  texte: string;
  image?: { donnees: Uint8Array<ArrayBuffer>; mediaType: string };
  /** La clé de l'envoi : deux fois la même ne crée qu'un dépôt. */
  cleEnvoi: string;
};

export type ConceptAEcrire = {
  concept: string;
  tags: string[];
  uncertain: boolean;
};

/**
 * Crée le dépôt, ou rend celui que le même envoi a déjà créé. La contrainte
 * d'unicité fait foi : deux requêtes simultanées ne peuvent pas la contourner.
 */
export async function creerDepot(
  depot: DepotADeposer,
): Promise<{ input: Input; nouveau: boolean }> {
  const existant = await prisma.input.findUnique({
    where: { userId_submissionKey: { userId: depot.userId, submissionKey: depot.cleEnvoi } },
  });

  if (existant) return { input: existant, nouveau: false };

  try {
    const input = await prisma.input.create({
      data: {
        userId: depot.userId,
        rawContent: depot.texte,
        sourceType: depot.image ? "IMAGE" : "TEXT",
        imageData: depot.image?.donnees ?? null,
        imageMediaType: depot.image?.mediaType ?? null,
        submissionKey: depot.cleEnvoi,
        status: "PENDING",
      },
    });

    return { input, nouveau: true };
  } catch {
    // Course perdue contre une requête jumelle : c'est elle qui a créé le dépôt.
    const rattrape = await prisma.input.findUnique({
      where: { userId_submissionKey: { userId: depot.userId, submissionKey: depot.cleEnvoi } },
    });

    if (!rattrape) throw new Error("Le dépôt n'a pas pu être créé.");

    return { input: rattrape, nouveau: false };
  }
}

export async function lireDepot(inputId: string): Promise<Input | null> {
  return prisma.input.findUnique({ where: { id: inputId } });
}

export async function marquerEnCours(inputId: string): Promise<void> {
  await prisma.input.update({ where: { id: inputId }, data: { status: "PROCESSING" } });
}

/**
 * Range le texte lu et efface les octets de l'image dans la même écriture :
 * dès que le texte existe, l'image n'a plus de raison d'être.
 */
export async function enregistrerTexteLu(inputId: string, texte: string): Promise<void> {
  await prisma.input.update({
    where: { id: inputId },
    data: { extractedText: texte, imageData: null, imageMediaType: null, status: "PROCESSING" },
  });
}

/** L'image n'a rien donné : on l'efface quand même, elle ne servira plus. */
export async function oublierImage(inputId: string): Promise<void> {
  await prisma.input.update({
    where: { id: inputId },
    data: { imageData: null, imageMediaType: null },
  });
}

export async function enregistrerConcepts(
  inputId: string,
  userId: string,
  concepts: ConceptAEcrire[],
): Promise<{ id: string; concept: string; uncertain: boolean }[]> {
  return prisma.$transaction(
    concepts.map((concept) =>
      prisma.atom.create({
        data: { inputId, userId, ...concept },
        select: { id: true, concept: true, uncertain: true },
      }),
    ),
  );
}

export async function marquerEchec(inputId: string, motif: string): Promise<void> {
  await prisma.input.update({
    where: { id: inputId },
    data: { status: "FAILED", failureReason: motif, imageData: null, imageMediaType: null },
  });
}

/**
 * Prêt : les concepts sont écrits et plus aucune question n'est attendue.
 *
 * Appelée à chaque fois qu'un travail se termine, réussi ou non : c'est le seul
 * endroit qui décide qu'un dépôt cesse d'annoncer un travail en cours. Le motif
 * ne sert que si le dépôt s'arrête sans avoir produit un seul concept.
 */
export async function marquerPretSiPlusRienEnAttente(
  inputId: string,
  motifSiVide = "Le découpage n'a rien donné.",
): Promise<boolean> {
  const restants = await prisma.generationJob.count({
    where: { inputId, status: { in: ["QUEUED", "RUNNING"] } },
  });

  if (restants > 0) return false;

  const enEchec = await prisma.generationJob.count({ where: { inputId, status: "FAILED" } });
  const concepts = await prisma.atom.count({ where: { inputId } });

  // Des questions manquantes ne condamnent pas un dépôt qui a ses concepts :
  // ce qui a coûté un appel reste, et l'écran dira ce qui manque.
  await prisma.input.update({
    where: { id: inputId },
    data:
      enEchec > 0 && concepts === 0
        ? { status: "FAILED", failureReason: motifSiVide }
        : { status: "READY" },
  });

  return true;
}
