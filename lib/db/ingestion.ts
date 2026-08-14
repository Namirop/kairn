import { prisma } from "@/lib/db/client";
import type { Input, InputNature } from "@/lib/db/types";

/**
 * Les écritures du pipeline d'ingestion, de la création du dépôt à son état
 * final.
 *
 * Rien n'est jeté de ce qui a coûté un appel : un dépôt dont l'extraction a
 * abouti garde ses concepts même si les questions échouent ensuite.
 *
 * Ce fichier écrit ce qui avance. Ce qui **arrête** un dépôt — rejet, panne,
 * clôture — vit dans `fin-de-depot.ts` : c'est là que se décide qui paie, et
 * cette décision-là mérite d'être lisible d'un seul tenant.
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

/**
 * Ce que l'extraction a lu du dépôt lui-même, avant ses concepts.
 *
 * Écrit même quand le dépôt ne donne rien : un rejet a une nature lui aussi, et
 * c'est elle qui dira plus tard pourquoi un dépôt n'a rien rendu.
 */
export async function enregistrerLExtraction(
  inputId: string,
  lecture: { nature: InputNature; conceptsTronques: boolean },
): Promise<void> {
  await prisma.input.update({ where: { id: inputId }, data: lecture });
}

export async function marquerEnCours(inputId: string): Promise<void> {
  await prisma.input.update({ where: { id: inputId }, data: { status: "PROCESSING" } });
}

/**
 * Range le texte lu et efface les octets de l'image dans la même écriture :
 * dès que le texte existe, l'image n'a plus de raison d'être.
 */
export async function enregistrerTexteLu(
  inputId: string,
  texte: string,
  tronque = false,
): Promise<void> {
  await prisma.input.update({
    where: { id: inputId },
    data: {
      extractedText: texte,
      texteTronque: tronque,
      imageData: null,
      imageMediaType: null,
      status: "PROCESSING",
    },
  });
}

/** L'image n'a rien donné : on l'efface quand même, elle ne servira plus. */
export async function oublierImage(inputId: string): Promise<void> {
  await prisma.input.update({
    where: { id: inputId },
    data: { imageData: null, imageMediaType: null },
  });
}

/**
 * Écrit les concepts d'un dépôt, sous le même propriétaire que lui.
 *
 * Le propriétaire n'est pas passé par l'appelant mais relu sur le dépôt : un
 * concept qui n'appartiendrait pas à qui a déposé serait invisible pour lui, ou
 * pire, visible pour quelqu'un d'autre. Il n'y a qu'une source de vérité.
 */
export async function enregistrerConcepts(
  inputId: string,
  concepts: ConceptAEcrire[],
): Promise<{ id: string; concept: string; uncertain: boolean }[]> {
  const depot = await prisma.input.findUniqueOrThrow({
    where: { id: inputId },
    select: { userId: true, anonymousSessionId: true },
  });

  return prisma.$transaction(
    concepts.map((concept) =>
      prisma.atom.create({
        data: {
          inputId,
          userId: depot.userId,
          anonymousSessionId: depot.anonymousSessionId,
          ...concept,
        },
        select: { id: true, concept: true, uncertain: true },
      }),
    ),
  );
}
