import { prisma } from "@/lib/db/client";
import { createSeedAccount, resetSeedAccount, SEED_EMAIL, SEED_TIMEZONE } from "./seed/account";
import { CORPUS } from "./seed/corpus";
import { writeCorpus } from "./seed/corpus-writer";
import { writeAiCalls, writeDailyUsage, writeFailedInput } from "./seed/ledger";
import { writeStats } from "./seed/stats";

/**
 * Remplit la base avec un compte de démonstration et trois mois d'usage
 * plausible : quatorze concepts sur les quatre états, des échéances dépassées et
 * à venir, un historique de passages rejoué par ts-fsrs, un dépôt en échec.
 *
 * C'est ce qui permet de développer et de regarder toute l'interface sans jamais
 * appeler le modèle.
 */
async function main(): Promise<void> {
  const now = new Date();

  await resetSeedAccount();
  const userId = await createSeedAccount();

  const { reviewedAt, atomsConsolidated } = await writeCorpus(userId, CORPUS, now);
  await writeFailedInput(userId, now);
  await writeAiCalls(userId, now);
  await writeDailyUsage(userId, SEED_TIMEZONE, reviewedAt);
  await writeStats(userId, SEED_TIMEZONE, reviewedAt, atomsConsolidated, now);

  const [atoms, variants, due] = await Promise.all([
    prisma.atom.count({ where: { userId } }),
    prisma.variant.count({ where: { atom: { userId } } }),
    prisma.atom.count({
      where: { userId, due: { lte: now }, state: { not: "ARCHIVED" } },
    }),
  ]);

  console.info(
    `Seed écrit pour ${SEED_EMAIL} — ${atoms} Atoms, ${variants} Variants, ` +
      `${reviewedAt.length} Reviews, ${atomsConsolidated} consolidés, ${due} dus aujourd'hui.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Le seed a échoué.", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
