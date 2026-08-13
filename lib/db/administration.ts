import { lireLaDepenseDuJour, type BlocDepense } from "@/lib/db/administration-depense";
import { prisma } from "@/lib/db/client";
import { debutDuJourUtc, ilYA } from "@/lib/domain/fenetre-utc";

/**
 * Les chiffres de l'écran d'administration, en lecture seule.
 *
 * Tout est daté en **UTC**. Mélanger deux calendriers sur un même écran rendrait
 * les lignes incomparables entre elles, et l'écart ne se verrait qu'aux heures où
 * les deux jours ne coïncident pas — c'est-à-dire tard, et mal.
 *
 * La dépense vit dans `administration-depense.ts` : c'est la seule des trois
 * mesures qui porte de la logique, et elle en porte assez pour son fichier.
 */

/**
 * Nombre de jours montrés par les séries et les tableaux.
 *
 * La même fenêtre partout, et pas une par écran : deux séries de longueurs
 * différentes posées sur le même écran se comparent à l'œil sans qu'on remarque
 * qu'elles ne couvrent pas la même chose.
 */
export const JOURS_MONTRES = 14;

export type BlocComptes = {
  total: number;
  nouveaux7j: number;
  nouveaux30j: number;
  /** Comptes ayant fait au moins un passage dans la fenêtre. */
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
  /** Ce qui est arrivé dans la fenêtre, seule mesure qui dise si ça s'aggrave. */
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
 * « Actif » se lit sur les passages et non sur la connexion : ouvrir l'écran ne
 * dit rien, réviser dit tout. C'est la seule définition qui distingue quelqu'un
 * qui se sert du produit de quelqu'un qui l'a ouvert.
 *
 * Le passage est daté par `reviewedAt` et non par un `createdAt` que `Review`
 * n'a pas — c'est aussi la colonne que porte l'index `[userId, reviewedAt]`,
 * donc celle qui rend le décompte des actifs gratuit.
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

/**
 * Les jours sont engendrés par la base plutôt que déduits des lignes trouvées :
 * un jour sans dépôt doit apparaître à zéro. Une série de jours qui saute les
 * jours vides se lit comme une activité continue.
 */
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

/**
 * Combien de questions ont été signalées, et combien récemment.
 *
 * La liste des signalements dit lesquels ; elle ne dit pas si le rythme change.
 * Un total qui monte de deux en un mois et un total qui monte de deux en une
 * journée se lisent pareil dans une liste triée par date, et ne veulent pas dire
 * du tout la même chose — le second est un prompt qui vient de casser.
 */
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
