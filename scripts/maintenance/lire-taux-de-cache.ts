import "dotenv/config";
import { prisma } from "@/lib/db/client";

/**
 * Le taux de lecture au cache par fournisseur, les bascules Luna → Sonnet et le
 * coût total sur la période, lus dans `AiCall`.
 *
 * L'économie de Luna contre Sonnet (−55 à −75 % annoncés) dépend du cache
 * OpenAI, automatique mais sensible au trafic : un préfixe rare ne cache pas.
 * Aucune décision automatique : on lit, on compare, on ajuste `AI_FOURNISSEUR`
 * à la main.
 *
 *   npm run lire:cache               # 7 derniers jours
 *   npm run lire:cache -- --jours=30 # 30 derniers jours
 */

function jours(): number {
  const arg = process.argv.find((a) => a.startsWith("--jours="));
  if (!arg) return 7;
  const n = Number(arg.slice("--jours=".length));
  if (!Number.isFinite(n) || n <= 0) return 7;
  return Math.floor(n);
}

type Ligne = {
  provider: string;
  appels: bigint;
  inputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  outputTokens: number;
  coutUsd: number;
};

async function main(): Promise<void> {
  const nbJours = jours();
  const debut = new Date(Date.now() - nbJours * 24 * 60 * 60 * 1000);

  console.info(`# Taux de cache et facture — ${nbJours} derniers jours\n`);

  const groupes = await prisma.aiCall.groupBy({
    by: ["provider"],
    where: { createdAt: { gte: debut } },
    _count: { _all: true },
    _sum: {
      inputTokens: true,
      cacheCreationTokens: true,
      cacheReadTokens: true,
      outputTokens: true,
      costUsd: true,
    },
  });

  const bascules = await prisma.aiCall.count({
    where: { createdAt: { gte: debut }, basculee: true },
  });

  if (groupes.length === 0) {
    console.info("Aucune ligne AiCall sur la période.");
    return;
  }

  const lignes: Ligne[] = groupes.map((g) => ({
    provider: g.provider,
    appels: BigInt(g._count._all),
    inputTokens: g._sum.inputTokens ?? 0,
    cacheReadTokens: g._sum.cacheReadTokens ?? 0,
    cacheCreationTokens: g._sum.cacheCreationTokens ?? 0,
    outputTokens: g._sum.outputTokens ?? 0,
    coutUsd: Number(g._sum.costUsd ?? 0),
  }));

  console.info(`| Fournisseur | Appels | Entrée totale | Cache read | Taux cache | Coût total   |`);
  console.info(`|:------------|-------:|--------------:|-----------:|-----------:|-------------:|`);
  for (const l of lignes) {
    const entreeTotale = l.inputTokens + l.cacheReadTokens + l.cacheCreationTokens;
    const tauxCache = entreeTotale > 0 ? l.cacheReadTokens / entreeTotale : 0;
    console.info(
      `| ${l.provider.padEnd(11)} | ${l.appels.toString().padStart(6)} | ${entreeTotale.toString().padStart(13)} | ${l.cacheReadTokens.toString().padStart(10)} | ${(tauxCache * 100).toFixed(1).padStart(9)} % | ${l.coutUsd.toFixed(6).padStart(11)} $ |`,
    );
  }
  console.info();
  console.info(
    `Bascules Luna → Sonnet : **${bascules}** sur la période (${(bascules / nbJours).toFixed(1)}/jour en moyenne, seuil d'alerte : 5/jour).`,
  );
  console.info();
  console.info(
    `Fourchette annoncée au portage (portage-luna.md §4) : −55 à −75 % contre Sonnet en catalogue. Comparer au coût qui aurait été facturé sur Sonnet (multiplier les tokens Luna par le ratio des prix : 2/0,2 pour l'entrée, 10/1,2 pour la sortie).`,
  );
}

main()
  .catch((erreur: unknown) => {
    console.error("Lecture du cache interrompue.", erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
