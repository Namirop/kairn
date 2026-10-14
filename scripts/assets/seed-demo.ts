import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { ETATS_QUI_POSENT_UNE_PIERRE } from "@/lib/domain/etat-maitrise";
import {
  creerLeCompteDeDemonstration,
  effacerLeCompteDeDemonstration,
  ADRESSE_DE_DEMONSTRATION,
  FUSEAU_DE_DEMONSTRATION,
} from "@/prisma/seed/compte-de-demonstration";
import { ecrireLeCorpus } from "@/prisma/seed/ecriture-du-corpus";
import { ecrireLUsageQuotidien } from "@/prisma/seed/registre";
import { construireLeCorpus } from "@/scripts/assets/fige-vers-seed";
import { lireFigeDAssets } from "@/scripts/assets/fige";
import { statsDeDemo } from "@/scripts/assets/stats-de-demo";

/**
 * Écrit le compte de démonstration à partir du figé d'assets : les vrais
 * concepts et questions du pipeline, plus un historique de révisions simulé qui
 * fait grandir le cairn et remplit la session du jour.
 *
 * Aucune dépense, aucun appel modèle — que de l'écriture en base, sur le seul
 * compte `ID_DE_DEMONSTRATION`. Rejouable : on efface, on recrée, on réécrit.
 *
 *   npm run assets:seed
 */
async function main(): Promise<void> {
  const maintenant = new Date();
  const depots = lireFigeDAssets();

  if (depots.length === 0) {
    console.error("Aucun figé d'assets. Lance d'abord : npm run assets:figer -- --emettre");
    process.exit(1);
  }

  await effacerLeCompteDeDemonstration();
  const userId = await creerLeCompteDeDemonstration();

  const corpus = construireLeCorpus(depots, maintenant);
  const { reviewedAt } = await ecrireLeCorpus(userId, corpus, maintenant);
  await ecrireLUsageQuotidien(userId, FUSEAU_DE_DEMONSTRATION, reviewedAt);

  // Le cairn compte CONSOLIDATED et ARCHIVED : on recompte en base plutôt que de
  // se fier au décompte partiel du writer, qui ignore les archivés.
  const atomsConsolidated = await prisma.atom.count({
    where: { userId, state: { in: ETATS_QUI_POSENT_UNE_PIERRE } },
  });
  const stats = statsDeDemo(corpus, maintenant, FUSEAU_DE_DEMONSTRATION);

  await prisma.userStats.update({
    where: { userId },
    data: {
      xp: stats.xp,
      level: stats.level,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      lastReviewedOn: stats.lastReviewedOn,
      atomsConsolidated,
    },
  });

  const [parEtat, dus, variants] = await Promise.all([
    prisma.atom.groupBy({ by: ["state"], where: { userId }, _count: true }),
    prisma.atom.count({
      where: {
        userId,
        due: { lte: maintenant },
        state: { not: "ARCHIVED" },
        variants: { some: { retiredAt: null } },
      },
    }),
    prisma.variant.count({ where: { atom: { userId } } }),
  ]);

  const etats = Object.fromEntries(parEtat.map((ligne) => [ligne.state, ligne._count]));

  console.info(
    `Seed d'assets écrit pour ${ADRESSE_DE_DEMONSTRATION} — ${reviewedAt.length} Reviews, ${variants} Variants.`,
  );
  console.info(`États : ${JSON.stringify(etats)}`);
  console.info(
    `Cairn : ${atomsConsolidated} pierres · Dus aujourd'hui : ${dus} · ` +
      `Série : ${stats.currentStreak} j · Niveau : ${stats.level} (${stats.xp} XP).`,
  );
}

main()
  .catch((erreur: unknown) => {
    console.error("Le seed d'assets a échoué.", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
