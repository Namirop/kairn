import { lireLaDepenseDuJour, type BlocDepense } from "@/lib/db/administration-depense";
import { prisma } from "@/lib/db/client";
import { debutDuJourUtc, ilYA } from "@/lib/domain/fenetre-utc";

/** Tout en UTC : deux calendriers sur un écran rendraient les lignes incomparables. */

/** Une seule fenêtre pour tous, sinon deux séries côte à côte se comparent à tort. */
export const JOURS_MONTRES = 14;

export type BlocComptes = {
  total: number;
  nouveaux7j: number;
  nouveaux30j: number;
  /** Au moins un passage dans la fenêtre. */
  actifs7j: number;
  actifs30j: number;
  seriesEnCours: number;
  plusLongueSerieEnCours: number;
};

export type LigneDeJour = {
  jour: string;
  depots: number;
  concepts: number;
  /** Nul un jour sans dépôt : zéro concept sur zéro dépôt ne fait pas zéro. */
  moyenne: number | null;
};

export type BlocSignalements = {
  total: number;
  /** Seule mesure qui dise si ça s'aggrave. */
  sur7j: number;
};

export type Administration = {
  comptes: BlocComptes;
  depense: BlocDepense;
  volumes: LigneDeJour[];
  signalements: BlocSignalements;
};

type LigneDeComptes = {
  total: number;
  nouveaux7j: number;
  nouveaux30j: number;
  actifs7j: number;
  actifs30j: number;
  series: number;
  plus_longue: number | null;
};

/**
 * « Actif » se lit sur les passages : ouvrir l'écran n'est pas se servir du
 * produit. `Review` se date par `reviewedAt` (index `[userId, reviewedAt]`).
 */
export async function lireLesComptes(maintenant: Date = new Date()): Promise<BlocComptes> {
  const sept = ilYA(maintenant, 7);
  const trente = ilYA(maintenant, 30);

  const [ligne] = await prisma.$queryRaw<LigneDeComptes[]>`
    SELECT
      (SELECT count(*) FROM "User")::int AS total,
      (SELECT count(*) FROM "User" WHERE "createdAt" >= ${sept})::int AS nouveaux7j,
      (SELECT count(*) FROM "User" WHERE "createdAt" >= ${trente})::int AS nouveaux30j,
      (SELECT count(DISTINCT "userId") FROM "Review" WHERE "reviewedAt" >= ${sept})::int AS actifs7j,
      (SELECT count(DISTINCT "userId") FROM "Review" WHERE "reviewedAt" >= ${trente})::int AS actifs30j,
      (SELECT count(*) FROM "UserStats" WHERE "currentStreak" > 0)::int AS series,
      (SELECT max("currentStreak") FROM "UserStats")::int AS plus_longue
  `;

  return {
    total: ligne?.total ?? 0,
    nouveaux7j: ligne?.nouveaux7j ?? 0,
    nouveaux30j: ligne?.nouveaux30j ?? 0,
    actifs7j: ligne?.actifs7j ?? 0,
    actifs30j: ligne?.actifs30j ?? 0,
    seriesEnCours: ligne?.series ?? 0,
    plusLongueSerieEnCours: ligne?.plus_longue ?? 0,
  };
}

type LigneDeVolume = { jour: string; depots: number; concepts: number };

/** `generate_series` plutôt que les lignes trouvées : un jour vide apparaît à zéro. */
export async function lireLesVolumes(maintenant: Date = new Date()): Promise<LigneDeJour[]> {
  const premier = debutDuJourUtc(ilYA(maintenant, JOURS_MONTRES - 1));
  const dernier = debutDuJourUtc(maintenant);

  const lignes = await prisma.$queryRaw<LigneDeVolume[]>`
    SELECT
      to_char(j, 'YYYY-MM-DD') AS jour,
      (SELECT count(*)::int FROM "Input"
        WHERE "createdAt" >= j AND "createdAt" < j + interval '1 day') AS depots,
      (SELECT count(*)::int FROM "Atom"
        WHERE "createdAt" >= j AND "createdAt" < j + interval '1 day') AS concepts
    FROM generate_series(${premier}::timestamptz, ${dernier}::timestamptz, interval '1 day') AS j
    ORDER BY j DESC
  `;

  return lignes.map((ligne) => ({
    jour: ligne.jour,
    depots: ligne.depots,
    concepts: ligne.concepts,
    moyenne: ligne.depots === 0 ? null : ligne.concepts / ligne.depots,
  }));
}

/** La liste dit lesquelles, pas si le rythme s'emballe (un prompt qui vient de casser). */
export async function compterLesSignalements(
  maintenant: Date = new Date(),
): Promise<BlocSignalements> {
  const [total, sur7j] = await Promise.all([
    prisma.signalement.count(),
    prisma.signalement.count({ where: { createdAt: { gte: ilYA(maintenant, 7) } } }),
  ]);

  return { total, sur7j };
}

export async function lireLAdministration(maintenant: Date = new Date()): Promise<Administration> {
  const [comptes, depense, volumes, signalements] = await Promise.all([
    lireLesComptes(maintenant),
    lireLaDepenseDuJour(maintenant),
    lireLesVolumes(maintenant),
    compterLesSignalements(maintenant),
  ]);

  return { comptes, depense, volumes, signalements };
}
