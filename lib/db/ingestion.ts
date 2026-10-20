import { prisma } from "@/lib/db/client";
import type { Input, InputNature } from "@/lib/db/types";
import { lireLangueUtilisateur } from "@/lib/db/reglages-du-compte";

/** Ce qui fait avancer un dépôt ; ce qui l'arrête vit dans `fin-de-depot.ts`. */

export type DepotADeposer = {
  userId: string;
  texte: string;
  image?: { donnees: Uint8Array<ArrayBuffer>; mediaType: string };
  /** Deux fois la même clé ne crée qu'un dépôt. */
  cleEnvoi: string;
  /** Ce que la personne dit de son dépôt, pour cadrer le découpage. */
  consigne?: string;
};

export type ConceptAEcrire = {
  concept: string;
  tags: string[];
  uncertain: boolean;
};

/** La contrainte d'unicité fait foi : deux requêtes simultanées ne la contournent pas. */
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
    // Course perdue contre une requête jumelle, qui a créé le dépôt.
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

/** Écrit même sur un rejet : la nature dit pourquoi le dépôt n'a rien rendu. */
export async function enregistrerLExtraction(
  inputId: string,
  lecture: { nature: InputNature; conceptsTronques: boolean; texteRetenu: string | null },
): Promise<void> {
  await prisma.input.update({ where: { id: inputId }, data: lecture });
}

export async function marquerEnCours(inputId: string): Promise<void> {
  await prisma.input.update({ where: { id: inputId }, data: { status: "PROCESSING" } });
}

/** Efface l'image dans la même écriture : le texte lu la remplace. */
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

/** L'image n'a rien donné : effacée quand même, elle ne servira plus. */
export async function oublierImage(inputId: string): Promise<void> {
  await prisma.input.update({
    where: { id: inputId },
    data: { imageData: null, imageMediaType: null },
  });
}

/** Le propriétaire, compte ou visite, est relu sur le dépôt : une seule source de vérité. */
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
