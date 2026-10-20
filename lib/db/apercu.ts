import { prisma } from "@/lib/db/client";
import type { VarianteEnBase } from "@/lib/db/question-servie";

/** Pour la vitrine d'assets, figée sur une vraie question ; sa route est inerte hors dev. */

export type ConceptEtVariante = {
  concept: { id: string; concept: string; tags: string[]; lastReview: Date | null };
  variante: VarianteEnBase;
};

export async function lireVariantePourApercu(variantId: string): Promise<ConceptEtVariante | null> {
  const variante = await prisma.variant.findUnique({
    where: { id: variantId },
    include: {
      atom: { select: { id: true, concept: true, tags: true, lastReview: true } },
    },
  });

  if (!variante) return null;

  return {
    concept: {
      id: variante.atom.id,
      concept: variante.atom.concept,
      tags: variante.atom.tags,
      lastReview: variante.atom.lastReview,
    },
    variante: {
      id: variante.id,
      format: variante.format,
      facet: variante.facet,
      question: variante.question,
      answerKey: variante.answerKey,
      payload: variante.payload,
    },
  };
}
