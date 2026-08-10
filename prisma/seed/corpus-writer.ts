import { prisma } from "@/lib/db/client";
import type { SeedAtom, SeedInput } from "./corpus-types";
import { replay, type ReplayedReview } from "./replay";

/** Ce que l'écriture du corpus rend au reste du seed pour calculer les compteurs. */
export type WrittenCorpus = {
  reviewedAt: Date[];
  atomsConsolidated: number;
};

function daysBefore(reference: Date, days: number): Date {
  return new Date(reference.getTime() - days * 24 * 60 * 60 * 1000);
}

async function writeVariants(atomId: string, atom: SeedAtom, reviews: ReplayedReview[]) {
  const created = [];

  for (const [index, variant] of atom.variants.entries()) {
    const seen = reviews.filter((review) => review.variantIndex === index);
    const last = seen.at(-1);

    created.push(
      await prisma.variant.create({
        data: {
          atomId,
          format: variant.format,
          facet: variant.facet,
          question: variant.question,
          answerKey: variant.answerKey,
          payload: variant.payload,
          seenCount: seen.length,
          lastSeenAt: last?.reviewedAt ?? null,
        },
      }),
    );
  }

  return created;
}

async function writeAtom(
  userId: string,
  inputId: string,
  atom: SeedAtom,
  now: Date,
): Promise<Date[]> {
  const { card, reviews } = replay(atom, now);
  const oldest = atom.history.at(0)?.[0] ?? 0;

  const created = await prisma.atom.create({
    data: {
      inputId,
      userId,
      concept: atom.concept,
      tags: atom.tags,
      state: atom.state,
      archivedAt: atom.archivedDaysAgo === undefined ? null : daysBefore(now, atom.archivedDaysAgo),
      archivedByUser: atom.archivedDaysAgo !== undefined,
      createdAt: daysBefore(now, oldest),
      ...card,
    },
  });

  const variants = await writeVariants(created.id, atom, reviews);

  for (const review of reviews) {
    const variant = variants[review.variantIndex] ?? variants[0];
    if (!variant) continue;

    await prisma.review.create({
      data: {
        atomId: created.id,
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

async function writeInput(userId: string, input: SeedInput, now: Date): Promise<Date[]> {
  const createdAt = daysBefore(now, input.createdDaysAgo);

  const created = await prisma.input.create({
    data: {
      userId,
      rawContent: input.rawContent,
      sourceType: input.sourceType,
      extractedText: input.extractedText ?? null,
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

  const dates: Date[] = [];
  for (const atom of input.atoms) {
    dates.push(...(await writeAtom(userId, created.id, atom, now)));
  }
  return dates;
}

export async function writeCorpus(
  userId: string,
  corpus: SeedInput[],
  now: Date,
): Promise<WrittenCorpus> {
  const reviewedAt: Date[] = [];

  for (const input of corpus) {
    reviewedAt.push(...(await writeInput(userId, input, now)));
  }

  return {
    reviewedAt,
    atomsConsolidated: corpus
      .flatMap((input) => input.atoms)
      .filter((atom) => atom.state === "CONSOLIDATED").length,
  };
}
