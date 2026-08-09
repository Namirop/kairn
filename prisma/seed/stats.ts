import { prisma } from "@/lib/db/client";
import { dayToUtcDate, localDay } from "@/lib/domain/local-day";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Suites de jours consécutifs, la plus longue et celle qui court encore. */
function measureStreaks(days: string[], today: string): { current: number; longest: number } {
  const sorted = [...new Set(days)].sort();
  let longest = 0;
  let run = 0;
  let previous: string | undefined;
  let currentRun = 0;

  for (const day of sorted) {
    const isNext =
      previous !== undefined &&
      dayToUtcDate(day).getTime() - dayToUtcDate(previous).getTime() === DAY_MS;
    run = isNext ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
    currentRun = run;
  }

  const last = sorted.at(-1);
  const gapToToday =
    last === undefined
      ? Infinity
      : (dayToUtcDate(today).getTime() - dayToUtcDate(last).getTime()) / DAY_MS;

  return { current: gapToToday <= 1 ? currentRun : 0, longest };
}

/**
 * Compteurs du compte de démonstration, reconstitués depuis les passages écrits.
 *
 * La formule d'XP définitive appartient à une phase ultérieure : celle-ci sert
 * seulement à donner au tableau de bord des nombres cohérents entre eux.
 */
export async function writeStats(
  userId: string,
  timezone: string,
  reviewedAt: Date[],
  atomsConsolidated: number,
  now: Date,
): Promise<void> {
  const days = reviewedAt.map((date) => localDay(date, timezone));
  const today = localDay(now, timezone);
  const { current, longest } = measureStreaks(days, today);
  const xp = reviewedAt.length * 12 + atomsConsolidated * 40;

  await prisma.userStats.update({
    where: { userId },
    data: {
      xp,
      level: 1 + Math.floor(xp / 250),
      currentStreak: current,
      longestStreak: longest,
      lastReviewedOn: days.length > 0 ? dayToUtcDate([...days].sort().at(-1) ?? today) : null,
      atomsConsolidated,
    },
  });
}
