import { prisma } from "@/lib/db/client";

/**
 * Ce qu'un compte peut faire de ses propres données : les emporter, ou les
 * effacer.
 *
 * Les deux sont des droits, pas des fonctionnalités. Ils ne se négocient pas
 * contre un abonnement, ne demandent pas d'écrire à quelqu'un, et ne passent par
 * aucun délai : deux gestes, depuis les réglages.
 */

/**
 * Efface le compte et tout ce qui en découle.
 *
 * Une seule instruction : les cascades du schéma emportent les réglages, les
 * statistiques, les dépôts, les concepts, les questions, les passages, les
 * quotas et les envois d'emails. Les énumérer ici les ferait diverger du schéma
 * le jour où une table s'ajoute — c'est la base qui tient la liste, et une
 * vérification s'assure qu'elle est complète.
 *
 * **Trois tables survivent volontairement, détachées de leur auteur.** Le
 * registre des appels modèle, parce que la comptabilité d'une dépense déjà
 * engagée ne s'efface pas avec la personne qui l'a déclenchée. Les signalements,
 * parce qu'ils portent une question à corriger et non des données personnelles.
 * Les retours sur le produit, pour la même raison : ils portent un défaut à
 * réparer, et l'effacer avec le compte reviendrait à perdre le travail restant
 * au moment où la personne part — souvent parce que quelque chose ne lui
 * convenait pas. Dans les trois cas le lien tombe à nul.
 *
 * **La capture jointe à un retour, elle, part.** C'est la seule chose de ces
 * trois tables qui puisse porter n'importe quoi sans que personne l'ait relu :
 * une image montre souvent plus que ce que son auteur croit y montrer, et le
 * texte du retour suffit à savoir ce qu'il y avait à corriger. Elle est effacée
 * avant la suppression, pas après — la ligne perd son lien au compte à
 * l'instant du `delete`, et on ne saurait plus laquelle viser.
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
  /** Ce que ce fichier contient, pour qui l'ouvre sans contexte. */
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
  /** Ce que la personne nous a écrit sur le produit. La capture n'y est pas. */
  retours: { envoyeLe: string; sujet: string; ecran: string | null; message: string }[];
};

/**
 * Tout ce que la personne a déposé, et où elle en est.
 *
 * Le fichier est lisible par un humain sans documentation : les clés sont dans
 * le vocabulaire du produit, les dates en ISO, et rien n'y est un identifiant
 * interne. Un export qu'on ne peut pas relire n'exerce aucun droit.
 *
 * Les questions et les passages sont inclus : ce sont des données produites à
 * partir de ce que la personne a déposé, et sa progression ne se comprend pas
 * sans elles.
 *
 * Les retours sur le produit aussi : ce sont des textes qu'elle a écrits et que
 * nous détenons, donc ils lui appartiennent. Pas la capture qu'elle y a jointe —
 * un export est un fichier JSON qu'on relit, et y coller une image en base64 le
 * rendrait illisible pour ce qu'elle contient déjà.
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
