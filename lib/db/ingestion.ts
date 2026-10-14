import { prisma } from "@/lib/db/client";
import type { Input, InputNature } from "@/lib/db/types";
import { lireLangueUtilisateur } from "@/lib/db/reglages-du-compte";

/**
 * Les écritures qui font avancer un dépôt. Ce qui l'arrête — rejet, panne,
 * clôture — vit dans `fin-de-depot.ts`, où se décide qui paie.
 */

export type DepotADeposer = {
  userId: string;
  texte: string;
  image?: { donnees: Uint8Array<ArrayBuffer>; mediaType: string };
  /** La clé de l'envoi : deux fois la même ne crée qu'un dépôt. */
  cleEnvoi: string;
  /** Ce que la personne a dit de son dépôt, pour cadrer le découpage. */
  consigne?: string;
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

  // Figée ici, au dépôt : changer de langue plus tard ne retraduit rien.
  const langue = await lireLangueUtilisateur(depot.userId);

  try {
    const input = await prisma.input.create({
      data: {
        userId: depot.userId,
        langue,
        rawContent: depot.texte,
        instruction: depot.consigne ?? null,
        sourceType: depot.image ? "IMAGE" : "TEXT",
        imageData: depot.image?.donnees ?? null,
        imageMediaType: depot.image?.mediaType ?? null,
        submissionKey: depot.cleEnvoi,
        status: "PENDING",
      },
    });

    return { input, nouveau: true };
  } catch (erreur) {
    // Course perdue contre une requête jumelle : c'est elle qui a créé le dépôt.
    const rattrape = await prisma.input.findUnique({
      where: { userId_submissionKey: { userId: depot.userId, submissionKey: depot.cleEnvoi } },
    });

    if (!rattrape) throw new Error("Le dépôt n'a pas pu être créé.", { cause: erreur });

    return { input: rattrape, nouveau: false };
  }
}

export async function lireDepot(inputId: string): Promise<Input | null> {
  return prisma.input.findUnique({ where: { id: inputId } });
}

/**
 * Ce que l'extraction a lu du dépôt lui-même. Écrit même sur un rejet : sa
 * nature dit pourquoi le dépôt n'a rien rendu.
 */
export async function enregistrerLExtraction(
  inputId: string,
  lecture: { nature: InputNature; conceptsTronques: boolean; texteRetenu: string | null },
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
 * Écrit les concepts d'un dépôt. Le propriétaire — compte ou session anonyme —
 * est relu sur le dépôt plutôt que passé par l'appelant : il n'y a qu'une
 * source de vérité.
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
