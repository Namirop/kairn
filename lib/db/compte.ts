import { prisma } from "@/lib/db/client";

/** Emporter ses données ou les effacer, sans condition ni délai. */

/**
 * Par les cascades du schéma ; `scripts/verification/cases/compte-efface.ts`
 * vérifie la liste. Survivent détachées (`SetNull`) : `AiCall` (la dépense
 * reste comptée), `Signalement` et `Retour` (un défaut, pas une donnée
 * personnelle). La capture d'un retour part avant : après, plus de ligne à viser.
 */
export async function supprimerLeCompte(userId: string): Promise<boolean> {
  await prisma.retour.updateMany({
    where: { userId },
    data: { captureData: null, captureMediaType: null },
  });

  const { count } = await prisma.user.deleteMany({ where: { id: userId } });

  return count === 1;
}

export type CompteExporte = {
  /** Pour qui ouvre le fichier sans contexte. */
  aPropos: string;
  exporteLe: string;
  compte: { email: string; nom: string; inscritLe: string; fuseau: string };
  progression: {
    xp: number;
    niveau: number;
    serieEnCours: number;
    plusLongueSerie: number;
    conceptsConsolides: number;
  } | null;
  depots: {
    depose: string;
    texte: string;
    texteExtraitDuneImage: string | null;
    etat: string;
    concepts: {
      concept: string;
      tags: string[];
      etat: string;
      prochaineEcheance: string;
      questions: { question: string; reponse: string; format: string; angle: string }[];
      passages: { le: string; note: string; mode: string; tempsMs: number }[];
    }[];
  }[];
  /** Sans la capture. */
  retours: { envoyeLe: string; sujet: string; ecran: string | null; message: string }[];
};

/**
 * Lisible sans documentation : clés du vocabulaire produit, dates ISO, aucun
 * identifiant interne. Pas de capture : en base64, le JSON deviendrait illisible.
 */
export async function exporterLeCompte(userId: string): Promise<CompteExporte | null> {
  const compte = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      createdAt: true,
      settings: { select: { timezone: true } },
      stats: {
        select: {
          xp: true,
          level: true,
          currentStreak: true,
          longestStreak: true,
          atomsConsolidated: true,
        },
      },
    },
  });

  if (!compte) return null;

  const retours = await prisma.retour.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, sujet: true, ecran: true, message: true },
  });

  const depots = await prisma.input.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      rawContent: true,
      extractedText: true,
      status: true,
      atoms: {
        orderBy: { createdAt: "asc" },
        select: {
          concept: true,
          tags: true,
          state: true,
          due: true,
          variants: {
            orderBy: { createdAt: "asc" },
            select: { question: true, answerKey: true, format: true, facet: true },
          },
          reviews: {
            orderBy: { reviewedAt: "asc" },
            select: { reviewedAt: true, rating: true, mode: true, responseTimeMs: true },
          },
        },
      },
    },
  });

  return {
    aPropos:
      "Export de tes données Kairn. Chaque dépôt est ce que tu as collé, tel quel, suivi des concepts qui en ont été tirés, de leurs questions et de tes passages.",
    exporteLe: new Date().toISOString(),
    compte: {
      email: compte.email,
      nom: compte.name,
      inscritLe: compte.createdAt.toISOString(),
      fuseau: compte.settings?.timezone ?? "UTC",
    },
    progression: compte.stats
      ? {
          xp: compte.stats.xp,
          niveau: compte.stats.level,
          serieEnCours: compte.stats.currentStreak,
          plusLongueSerie: compte.stats.longestStreak,
          conceptsConsolides: compte.stats.atomsConsolidated,
        }
      : null,
    depots: depots.map((depot) => ({
      depose: depot.createdAt.toISOString(),
      texte: depot.rawContent,
      texteExtraitDuneImage: depot.extractedText,
      etat: depot.status,
      concepts: depot.atoms.map((atome) => ({
        concept: atome.concept,
        tags: atome.tags,
        etat: atome.state,
        prochaineEcheance: atome.due.toISOString(),
        questions: atome.variants.map((variante) => ({
          question: variante.question,
          reponse: variante.answerKey,
          format: variante.format,
          angle: variante.facet,
        })),
        passages: atome.reviews.map((passage) => ({
          le: passage.reviewedAt.toISOString(),
          note: passage.rating,
          mode: passage.mode,
          tempsMs: passage.responseTimeMs,
        })),
      })),
    })),
    retours: retours.map((retour) => ({
      envoyeLe: retour.createdAt.toISOString(),
      sujet: retour.sujet,
      ecran: retour.ecran,
      message: retour.message,
    })),
  };
}
