import { prisma } from "@/lib/db/client";
import { dayToUtcDate, localDay } from "@/lib/domain/local-day";

function daysBefore(reference: Date, days: number): Date {
  return new Date(reference.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Les trois fins sans concept, pour qu'on puisse les regarder côte à côte sans
 * provoquer de vrai incident.
 *
 * Un rejet — la chaîne a lu et n'a rien trouvé, avec le motif qu'elle a écrit.
 * Une panne — quelque chose s'est cassé, on peut relancer. Un dépôt vidé — il a
 * donné des concepts, l'utilisateur les a tous supprimés, le texte reste.
 */
export async function writeFailedInput(userId: string, now: Date): Promise<void> {
  const rejet = daysBefore(now, 2);
  const panne = daysBefore(now, 4);
  const vide = daysBefore(now, 6);

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
