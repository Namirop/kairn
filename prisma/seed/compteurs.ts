import { prisma } from "@/lib/db/client";
import { jourEnDateUtc, jourLocal } from "@/lib/domain/jour-local";

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Suites de jours consécutifs, la plus longue et celle qui court encore. */
function mesurerLesSeries(
  jours: string[],
  aujourdhui: string,
): { enCours: number; plusLongue: number } {
  const tries = [...new Set(jours)].sort();
  let plusLongue = 0;
  let serie = 0;
  let precedent: string | undefined;
  let serieEnCours = 0;

  for (const jour of tries) {
    const estLeLendemain =
      precedent !== undefined &&
      jourEnDateUtc(jour).getTime() - jourEnDateUtc(precedent).getTime() === JOUR_MS;
    serie = estLeLendemain ? serie + 1 : 1;
    plusLongue = Math.max(plusLongue, serie);
    precedent = jour;
    serieEnCours = serie;
  }

  const dernier = tries.at(-1);
  const ecartAAujourdhui =
    dernier === undefined
      ? Infinity
      : (jourEnDateUtc(aujourdhui).getTime() - jourEnDateUtc(dernier).getTime()) / JOUR_MS;

  return { enCours: ecartAAujourdhui <= 1 ? serieEnCours : 0, plusLongue };
}

/**
 * Compteurs du compte de démonstration, reconstitués depuis les passages écrits.
 *
 * L'XP et le niveau ne suivent pas `lib/domain/progression.ts` : ils donnent
 * seulement au tableau de bord des nombres cohérents entre eux.
 */
export async function ecrireLesCompteurs(
  userId: string,
  fuseau: string,
  reviewedAt: Date[],
  atomsConsolidated: number,
  maintenant: Date,
): Promise<void> {
  const jours = reviewedAt.map((date) => jourLocal(date, fuseau));
  const aujourdhui = jourLocal(maintenant, fuseau);
  const { enCours, plusLongue } = mesurerLesSeries(jours, aujourdhui);
  const xp = reviewedAt.length * 12 + atomsConsolidated * 40;

  await prisma.userStats.update({
    where: { userId },
    data: {
      xp,
      level: 1 + Math.floor(xp / 250),
      currentStreak: enCours,
      longestStreak: plusLongue,
      lastReviewedOn:
        jours.length > 0 ? jourEnDateUtc([...jours].sort().at(-1) ?? aujourdhui) : null,
      atomsConsolidated,
    },
  });
}
