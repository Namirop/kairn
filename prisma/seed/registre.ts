import { prisma } from "@/lib/db/client";
import { jourEnDateUtc, jourLocal } from "@/lib/domain/jour-local";

function joursAvant(reference: Date, jours: number): Date {
  return new Date(reference.getTime() - jours * 24 * 60 * 60 * 1000);
}

/**
 * Les trois fins sans concept, à regarder côte à côte sans provoquer
 * d'incident : un rejet (rien à retenir), une panne (relançable), un dépôt
 * vidé par son auteur.
 */
export async function ecrireLesDepotsSansConcept(userId: string, maintenant: Date): Promise<void> {
  const rejet = joursAvant(maintenant, 2);
  const panne = joursAvant(maintenant, 4);
  const vide = joursAvant(maintenant, 6);

  await prisma.input.create({
    data: {
      userId,
      rawContent: "https://example.com/article-tres-long — collé sans le contenu de la page.",
      sourceType: "TEXT",
      status: "REJECTED",
      failureReason:
        "Tu as collé une adresse, pas le texte qu'elle désigne. Ouvre la page et copie le passage qui t'intéresse : je ne vais pas la chercher à ta place.",
      createdAt: rejet,
      updatedAt: rejet,
      jobs: {
        create: {
          kind: "ATOMS",
          status: "DONE",
          attempts: 1,
          createdAt: rejet,
          startedAt: rejet,
          finishedAt: rejet,
        },
      },
    },
  });

  await prisma.input.create({
    data: {
      userId,
      rawContent:
        "Le protocole QUIC multiplexe plusieurs flux sur une seule connexion UDP, ce qui supprime le blocage en tête de file du TCP.",
      sourceType: "TEXT",
      status: "FAILED",
      failureReason:
        "Le découpage n'a pas abouti après trois tentatives. Rien n'a été écrit, et rien n'a été perdu.",
      createdAt: panne,
      updatedAt: panne,
      jobs: {
        create: {
          kind: "ATOMS",
          status: "FAILED",
          attempts: 3,
          lastError: "Sortie du modèle invalide : le champ `atoms` était vide.",
          createdAt: panne,
          startedAt: panne,
          finishedAt: panne,
        },
      },
    },
  });

  await prisma.input.create({
    data: {
      userId,
      rawContent:
        "Un `Map` garde l'ordre d'insertion de ses clés, contrairement à un objet dont les clés numériques remontent en tête. Les clés peuvent être de n'importe quel type, y compris des objets.",
      sourceType: "TEXT",
      status: "READY",
      createdAt: vide,
      updatedAt: vide,
      jobs: {
        create: {
          kind: "ATOMS",
          status: "DONE",
          attempts: 1,
          createdAt: vide,
          startedAt: vide,
          finishedAt: vide,
        },
      },
    },
  });
}

/**
 * Quelques lignes du registre d'appels modèle, datées d'hier ou avant pour que
 * le seed n'entame pas le plafond journalier.
 */
export async function ecrireLesAppels(userId: string, maintenant: Date): Promise<void> {
  const appels = [
    {
      ilYAJours: 6,
      purpose: "extract_atoms",
      inputTokens: 1_180,
      outputTokens: 640,
      latencyMs: 4_120,
      success: true,
    },
    {
      ilYAJours: 6,
      purpose: "generate_variants",
      inputTokens: 940,
      outputTokens: 1_310,
      latencyMs: 6_880,
      success: true,
    },
    {
      ilYAJours: 3,
      purpose: "ocr_extract",
      inputTokens: 2_460,
      outputTokens: 210,
      latencyMs: 3_010,
      success: true,
    },
    {
      ilYAJours: 2,
      purpose: "extract_atoms",
      inputTokens: 1_020,
      outputTokens: 0,
      latencyMs: 1_190,
      success: false,
    },
  ];

  for (const appel of appels) {
    await prisma.aiCall.create({
      data: {
        userId,
        purpose: appel.purpose,
        model: process.env.AI_MODEL ?? "claude-sonnet-5",
        inputTokens: appel.inputTokens,
        outputTokens: appel.outputTokens,
        // 3 $ / M en entrée, 15 $ / M en sortie — voir lib/ai/cout-des-appels.ts.
        costUsd: (appel.inputTokens * 3 + appel.outputTokens * 15) / 1_000_000,
        latencyMs: appel.latencyMs,
        success: appel.success,
        errorCode: appel.success ? null : "SCHEMA_INVALIDE",
        createdAt: joursAvant(maintenant, appel.ilYAJours),
      },
    });
  }
}

/** Compteurs de quota, reconstitués depuis les dates de passage réelles. */
export async function ecrireLUsageQuotidien(
  userId: string,
  fuseau: string,
  reviewedAt: Date[],
): Promise<void> {
  const parJour = new Map<string, number>();
  for (const date of reviewedAt) {
    const jour = jourLocal(date, fuseau);
    parJour.set(jour, (parJour.get(jour) ?? 0) + 1);
  }

  for (const [jour, reviews] of parJour) {
    await prisma.dailyUsage.create({
      data: { userId, day: jourEnDateUtc(jour), reviews, generations: 0 },
    });
  }
}
