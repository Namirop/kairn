import { prisma } from "@/lib/db/client";

/**
 * Les réglages d'exploitation posés en base, et leur journal.
 *
 * Une valeur absente veut dire « non surchargé » : l'environnement reprend la
 * main, et on revient au défaut sans avoir à se souvenir de ce qu'il valait.
 *
 * `ADMIN_EMAILS` n'est pas ici et n'y sera pas : c'est la liste qui décide qui
 * ouvre l'écran depuis lequel on écrit cette table.
 */

/** Ce qu'on peut surcharger. Une clé absente veut dire « laisse l'environnement ». */
export type Surcharges = {
  enabled?: boolean;
  mock?: boolean;
  dailyCallCap?: number;
  userDailyCallCap?: number;
  anonymousDailyCallCap?: number;
  model?: string;
  maxTokens?: number;
};

/** Les réglages tels que l'écran les montre : la surcharge, ou rien. */
export type ReglagesPosés = {
  enabled: boolean | null;
  mock: boolean | null;
  dailyCallCap: number | null;
  userDailyCallCap: number | null;
  anonymousDailyCallCap: number | null;
  model: string | null;
  maxTokens: number | null;
};

const LIGNE = "reglages";

const VIDE: ReglagesPosés = {
  enabled: null,
  mock: null,
  dailyCallCap: null,
  userDailyCallCap: null,
  anonymousDailyCallCap: null,
  model: null,
  maxTokens: null,
};

/**
 * Les réglages comparés au moment de journaliser. Énumérés à la main :
 * `Object.keys` rend des chaînes qu'il faudrait retyper par assertion. Un
 * réglage ajouté sans l'inscrire ici changerait sans laisser de trace, et rien
 * dans le typage ne le signale.
 */
const CLES: (keyof ReglagesPosés)[] = [
  "enabled",
  "mock",
  "dailyCallCap",
  "userDailyCallCap",
  "anonymousDailyCallCap",
  "model",
  "maxTokens",
];

export async function lireLesReglagesPosés(): Promise<ReglagesPosés> {
  const ligne = await prisma.reglages.findUnique({ where: { id: LIGNE } });

  if (!ligne) return VIDE;

  return {
    enabled: ligne.aiEnabled,
    mock: ligne.mockAi,
    dailyCallCap: ligne.dailyCallCap,
    userDailyCallCap: ligne.userDailyCallCap,
    anonymousDailyCallCap: ligne.anonymousDailyCallCap,
    model: ligne.model,
    maxTokens: ligne.maxTokens,
  };
}

/**
 * Les surcharges, sous la forme que la configuration attend : les nuls sont
 * retirés, car c'est l'absence de clé qui signifie « prends l'environnement ».
 */
export async function lireLesSurcharges(): Promise<Surcharges> {
  const posés = await lireLesReglagesPosés();
  const surcharges: Surcharges = {};

  if (posés.enabled !== null) surcharges.enabled = posés.enabled;
  if (posés.mock !== null) surcharges.mock = posés.mock;
  if (posés.dailyCallCap !== null) surcharges.dailyCallCap = posés.dailyCallCap;
  if (posés.userDailyCallCap !== null) surcharges.userDailyCallCap = posés.userDailyCallCap;
  if (posés.anonymousDailyCallCap !== null) {
    surcharges.anonymousDailyCallCap = posés.anonymousDailyCallCap;
  }
  if (posés.model !== null) surcharges.model = posés.model;
  if (posés.maxTokens !== null) surcharges.maxTokens = posés.maxTokens;

  return surcharges;
}

function enTexte(valeur: boolean | number | string | null): string | null {
  return valeur === null ? null : String(valeur);
}

/**
 * Pose les réglages et journalise les seuls écarts, pour que la trace reste
 * lisible. Écriture et journal dans la même transaction : pas de changement
 * sans trace.
 */
export async function poserLesReglages(
  voulus: ReglagesPosés,
  parEmail: string,
): Promise<{ changements: number }> {
  const actuels = await lireLesReglagesPosés();

  const ecarts = CLES.map((cle) => ({
    cle,
    avant: enTexte(actuels[cle]),
    apres: enTexte(voulus[cle]),
  })).filter((ecart) => ecart.avant !== ecart.apres);

  if (ecarts.length === 0) return { changements: 0 };

  const colonnes = {
    aiEnabled: voulus.enabled,
    mockAi: voulus.mock,
    dailyCallCap: voulus.dailyCallCap,
    userDailyCallCap: voulus.userDailyCallCap,
    anonymousDailyCallCap: voulus.anonymousDailyCallCap,
    model: voulus.model,
    maxTokens: voulus.maxTokens,
  };

  await prisma.$transaction([
    prisma.reglages.upsert({
      where: { id: LIGNE },
      create: { id: LIGNE, ...colonnes },
      update: colonnes,
    }),
    prisma.reglageJournal.createMany({
      data: ecarts.map((ecart) => ({
        reglage: ecart.cle,
        avant: ecart.avant,
        apres: ecart.apres,
        parEmail,
      })),
    }),
  ]);

  return { changements: ecarts.length };
}

export type LigneDeJournal = {
  id: string;
  reglage: string;
  avant: string | null;
  apres: string | null;
  parEmail: string;
  createdAt: Date;
};

export async function lireLeJournal(combien = 20): Promise<LigneDeJournal[]> {
  return prisma.reglageJournal.findMany({
    orderBy: { createdAt: "desc" },
    take: combien,
  });
}
