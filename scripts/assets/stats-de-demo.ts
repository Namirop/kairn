import { dayToUtcDate, localDay } from "@/lib/domain/local-day";
import { progressionPourXp, xpDuPassage } from "@/lib/domain/progression";
import type { SeedInput } from "@/prisma/seed/corpus-types";

/**
 * Les compteurs du compte de démonstration, calculés par les vraies formules du
 * domaine — pas la formule placeholder du seed de développement.
 *
 * L'XP suit `xpDuPassage` passage par passage, le niveau `progressionPourXp`. La
 * série est le nombre de jours consécutifs révisés jusqu'à aujourd'hui : sur un
 * historique sans rendez-vous manqué — celui qu'on construit —, c'est exactement
 * ce que la logique de série du produit rend. Le nombre de pierres, lui, n'est
 * pas calculé ici : il se compte en base après écriture (CONSOLIDATED + ARCHIVED).
 */

export type StatsDeDemo = {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastReviewedOn: Date | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Suites de jours consécutifs : la plus longue, et celle qui court encore. */
function series(jours: string[], aujourdhui: string): { current: number; longest: number } {
  const tries = [...new Set(jours)].sort();
  let longest = 0;
  let run = 0;
  let precedent: string | undefined;

  for (const jour of tries) {
    const enchaine =
      precedent !== undefined &&
      dayToUtcDate(jour).getTime() - dayToUtcDate(precedent).getTime() === DAY_MS;
    run = enchaine ? run + 1 : 1;
    longest = Math.max(longest, run);
    precedent = jour;
  }

  const dernier = tries.at(-1);
  const ecartAAujourdhui =
    dernier === undefined
      ? Infinity
      : (dayToUtcDate(aujourdhui).getTime() - dayToUtcDate(dernier).getTime()) / DAY_MS;

  return { current: ecartAAujourdhui <= 1 ? run : 0, longest };
}

export function statsDeDemo(corpus: SeedInput[], now: Date, timezone: string): StatsDeDemo {
  const jours: string[] = [];
  let xp = 0;

  for (const input of corpus) {
    for (const atom of input.atoms) {
      atom.history.forEach(([daysAgo, note], rang) => {
        const notePrecedente = rang > 0 ? atom.history[rang - 1]?.[1] : undefined;
        xp += xpDuPassage(notePrecedente === "AGAIN", note !== "AGAIN");
        jours.push(localDay(new Date(now.getTime() - daysAgo * DAY_MS), timezone));
      });
    }
  }

  const aujourdhui = localDay(now, timezone);
  const { current, longest } = series(jours, aujourdhui);
  const dernierJour = [...jours].sort().at(-1);

  return {
    xp,
    level: progressionPourXp(xp).niveau,
    currentStreak: current,
    longestStreak: longest,
    lastReviewedOn: dernierJour ? dayToUtcDate(dernierJour) : null,
  };
}
