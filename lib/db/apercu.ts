import { prisma } from "@/lib/db/client";
import type { VarianteEnBase } from "@/lib/db/question-servie";

/**
 * Charge un Variant et son Atom pour la vitrine d'assets (dev-only).
 *
 * C'est le seul appelant : la vitrine a besoin d'une vraie question, désignée par
 * son id, pour la montrer dans un état de réponse figé sans piloter une session.
 * Rien n'est écrit. La route qui l'appelle est inerte hors développement.
 */

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
