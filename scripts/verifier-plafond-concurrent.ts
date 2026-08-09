import "dotenv/config";

/**
 * Preuve que le plafond journalier tient quand plusieurs appels partent au même
 * instant.
 *
 * Cette vérification ne peut pas vivre dans la suite Vitest : la garantie n'est
 * pas dans le code TypeScript, elle est dans l'atomicité d'une instruction
 * Postgres. La prouver demande une vraie base — c'est pourquoi elle rejoint les
 * vérifications d'exécution plutôt que les tests de `lib/domain/`.
 *
 * Le décompte se fait sur un jour sentinelle très éloigné, jamais sur
 * aujourd'hui : la vérification ne doit pas consommer de vraies places.
 *
 *   npm run verify:ai
 */

const JOUR_SENTINELLE = new Date("2999-01-01T12:00:00.000Z");
const PLAFOND = 10;
const TENTATIVES = 25;

async function main(): Promise<void> {
  const { prisma } = await import("@/lib/db/client");
  const { reserverAppelModele, lireReservationsDuJour } = await import("@/lib/db/ai-quota");
  const { dayToUtcDate, localDay } = await import("@/lib/domain/local-day");

  const cleJour = dayToUtcDate(localDay(JOUR_SENTINELLE, "UTC"));
  const nettoyer = () => prisma.aiCallQuota.deleteMany({ where: { day: cleJour } });

  await nettoyer();

  try {
    // Toutes les réservations partent ensemble, sans await entre elles.
    const resultats = await Promise.all(
      Array.from({ length: TENTATIVES }, () => reserverAppelModele(PLAFOND, JOUR_SENTINELLE)),
    );

    const obtenues = resultats.filter((r) => r.obtenue);
    const refusees = resultats.filter((r) => !r.obtenue);
    const numeros = obtenues.map((r) => r.utilisees).sort((a, b) => a - b);
    const enBase = await lireReservationsDuJour(JOUR_SENTINELLE);
    const attendus = Array.from({ length: PLAFOND }, (_, i) => i + 1);

    const verdicts = [
      [`${TENTATIVES} tentatives, ${PLAFOND} places accordées`, obtenues.length === PLAFOND],
      [`${TENTATIVES - PLAFOND} tentatives refusées`, refusees.length === TENTATIVES - PLAFOND],
      [
        "chaque place accordée porte un numéro unique de 1 à 10",
        numeros.join() === attendus.join(),
      ],
      [`le compteur en base s'arrête à ${PLAFOND}`, enBase === PLAFOND],
      ["un refus n'incrémente rien", refusees.every((r) => r.utilisees === PLAFOND)],
    ] as const;

    for (const [libelle, ok] of verdicts) {
      console.info(`${ok ? "ok  " : "ÉCHEC"}  ${libelle}`);
    }

    const echecs = verdicts.filter(([, ok]) => !ok).length;
    console.info(
      echecs === 0 ? "\nPlafond tenu sous concurrence." : `\n${echecs} vérification(s) en échec.`,
    );
    process.exitCode = echecs === 0 ? 0 : 1;
  } finally {
    await nettoyer();
    await prisma.$disconnect();
  }
}

main().catch((erreur: unknown) => {
  console.error("La vérification du plafond a échoué.", erreur);
  process.exitCode = 1;
});
