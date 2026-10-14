import { prisma } from "@/lib/db/client";
import type { AtomDuCorpus, InputDuCorpus } from "./types-du-corpus";
import { rejouer, type ReviewRejouee } from "./rejeu";

/** Ce que l'écriture du corpus rend au reste du seed pour calculer les compteurs. */
export type CorpusEcrit = {
  reviewedAt: Date[];
  atomsConsolidated: number;
};

function joursAvant(reference: Date, jours: number): Date {
  return new Date(reference.getTime() - jours * 24 * 60 * 60 * 1000);
}

async function ecrireLesVariants(atomId: string, atom: AtomDuCorpus, reviews: ReviewRejouee[]) {
  const crees = [];

  for (const [rang, variant] of atom.variants.entries()) {
    const vus = reviews.filter((review) => review.rangDuVariant === rang);
    const dernier = vus.at(-1);

    crees.push(
      await prisma.variant.create({
        data: {
          atomId,
          format: variant.format,
          facet: variant.facet,
          question: variant.question,
          answerKey: variant.answerKey,
          payload: variant.payload,
          sessionCount: vus.length,
          lastSessionAt: dernier?.reviewedAt ?? null,
        },
      }),
    );
  }

  return crees;
}

async function ecrireLAtom(
  userId: string,
  inputId: string,
  atom: AtomDuCorpus,
  maintenant: Date,
): Promise<Date[]> {
  const { card, reviews } = rejouer(atom, maintenant);
  const plusAncien = atom.historique.at(0)?.[0] ?? 0;

  const cree = await prisma.atom.create({
    data: {
      inputId,
      userId,
      concept: atom.concept,
      tags: atom.tags,
      state: atom.state,
      archivedAt:
        atom.archiveIlYAJours === undefined ? null : joursAvant(maintenant, atom.archiveIlYAJours),
      archivedByUser: atom.archiveIlYAJours !== undefined,
      createdAt: joursAvant(maintenant, plusAncien),
      ...card,
    },
  });

  const variants = await ecrireLesVariants(cree.id, atom, reviews);

  for (const review of reviews) {
    const variant = variants[review.rangDuVariant] ?? variants[0];
    if (!variant) continue;

    await prisma.review.create({
      data: {
        atomId: cree.id,
        variantId: variant.id,
        userId,
        rating: review.rating,
        responseTimeMs: review.responseTimeMs,
        selfMastered: false,
        stabilityBefore: review.stabilityBefore,
        stabilityAfter: review.stabilityAfter,
        reviewedAt: review.reviewedAt,
      },
    });
  }

  return reviews.map((review) => review.reviewedAt);
}

async function ecrireLInput(
  userId: string,
  input: InputDuCorpus,
  maintenant: Date,
): Promise<Date[]> {
  const createdAt = joursAvant(maintenant, input.deposeIlYAJours);

  const cree = await prisma.input.create({
    data: {
      userId,
      rawContent: input.rawContent,
      sourceType: input.sourceType,
      extractedText: input.extractedText ?? null,
      langue: input.langue,
      status: "READY",
      createdAt,
      updatedAt: createdAt,
      jobs: {
        create: [
          ...(input.sourceType === "IMAGE"
            ? [
                {
                  kind: "OCR" as const,
                  status: "DONE" as const,
                  attempts: 1,
                  createdAt,
                  startedAt: createdAt,
                  finishedAt: createdAt,
                },
              ]
            : []),
          {
            kind: "ATOMS" as const,
            status: "DONE" as const,
            attempts: 1,
            createdAt,
            startedAt: createdAt,
            finishedAt: createdAt,
          },
          {
            kind: "VARIANTS" as const,
            status: "DONE" as const,
            attempts: 1,
            createdAt,
            startedAt: createdAt,
            finishedAt: createdAt,
          },
        ],
      },
    },
  });

  const datesDeRevue: Date[] = [];
  for (const atom of input.atoms) {
    datesDeRevue.push(...(await ecrireLAtom(userId, cree.id, atom, maintenant)));
  }
  return datesDeRevue;
}

export async function ecrireLeCorpus(
  userId: string,
  corpus: InputDuCorpus[],
  maintenant: Date,
): Promise<CorpusEcrit> {
  const reviewedAt: Date[] = [];

  for (const input of corpus) {
    reviewedAt.push(...(await ecrireLInput(userId, input, maintenant)));
  }

  return {
    reviewedAt,
    atomsConsolidated: corpus
      .flatMap((input) => input.atoms)
      .filter((atom) => atom.state === "CONSOLIDATED").length,
  };
}
