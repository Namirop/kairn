import { prisma } from "@/lib/db/client";
import { dayToUtcDate, localDay } from "@/lib/domain/local-day";

function daysBefore(reference: Date, days: number): Date {
  return new Date(reference.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Un dépôt dont le découpage a échoué. Il existe pour qu'on puisse regarder
 * l'écran d'erreur sans provoquer un vrai échec.
 */
export async function writeFailedInput(userId: string, now: Date): Promise<void> {
  const createdAt = daysBefore(now, 2);

  await prisma.input.create({
    data: {
      userId,
      rawContent: "https://example.com/article-tres-long — collé sans le contenu de la page.",
      sourceType: "TEXT",
      status: "FAILED",
      createdAt,
      updatedAt: createdAt,
      jobs: {
        create: {
          kind: "ATOMS",
          status: "FAILED",
          attempts: 3,
          lastError: "Sortie du modèle invalide : le champ `atoms` était vide.",
          createdAt,
          startedAt: createdAt,
          finishedAt: createdAt,
        },
      },
    },
  });
}

/**
 * Quelques lignes du registre d'appels modèle, toutes datées d'hier ou avant :
 * le compteur du jour reste à zéro, donc le plafond journalier n'est pas entamé
 * par le seed.
 */
export async function writeAiCalls(userId: string, now: Date): Promise<void> {
  const calls = [
    {
      daysAgo: 6,
      purpose: "extract_atoms",
      inputTokens: 1_180,
      outputTokens: 640,
      latencyMs: 4_120,
      success: true,
    },
    {
      daysAgo: 6,
      purpose: "generate_variants",
      inputTokens: 940,
      outputTokens: 1_310,
      latencyMs: 6_880,
      success: true,
    },
    {
      daysAgo: 3,
      purpose: "ocr_extract",
      inputTokens: 2_460,
      outputTokens: 210,
      latencyMs: 3_010,
      success: true,
    },
    {
      daysAgo: 2,
      purpose: "extract_atoms",
      inputTokens: 1_020,
      outputTokens: 0,
      latencyMs: 1_190,
      success: false,
    },
  ];

  for (const call of calls) {
    await prisma.aiCall.create({
      data: {
        userId,
        purpose: call.purpose,
        model: process.env.AI_MODEL ?? "claude-sonnet-5",
        inputTokens: call.inputTokens,
        outputTokens: call.outputTokens,
        // 3 $ / M en entrée, 15 $ / M en sortie — voir lib/ai/pricing.ts.
        costUsd: (call.inputTokens * 3 + call.outputTokens * 15) / 1_000_000,
        latencyMs: call.latencyMs,
        success: call.success,
        errorCode: call.success ? null : "SCHEMA_INVALIDE",
        createdAt: daysBefore(now, call.daysAgo),
      },
    });
  }
}

/** Compteurs de quota, reconstitués depuis les dates de passage réelles. */
export async function writeDailyUsage(
  userId: string,
  timezone: string,
  reviewedAt: Date[],
): Promise<void> {
  const perDay = new Map<string, number>();
  for (const date of reviewedAt) {
    const day = localDay(date, timezone);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }

  for (const [day, reviews] of perDay) {
    await prisma.dailyUsage.create({
      data: { userId, day: dayToUtcDate(day), reviews, generations: 0 },
    });
  }
}
