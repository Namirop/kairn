import { jourEnDateUtc, jourLocal } from "@/lib/domain/jour-local";
import { progressionPourXp, xpDuPassage } from "@/lib/domain/progression";
import type { InputDuCorpus } from "@/prisma/seed/types-du-corpus";

/**
 * Les compteurs du compte de démonstration, par les vraies formules du domaine
 * (`xpDuPassage`, `progressionPourXp`), pas la formule simplifiée du seed de
 * développement.
 *
 * La série compte les jours consécutifs révisés : sur un historique sans
 * rendez-vous manqué, comme celui-ci, c'est ce que rend la logique du produit.
 * Les pierres se comptent en base après écriture (CONSOLIDATED + ARCHIVED).
 */

export type StatsDeDemo = {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastReviewedOn: Date | null;
};

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Suites de jours consécutifs : la plus longue, et celle qui court encore. */
function series(jours: string[], aujourdhui: string): { enCours: number; plusLongue: number } {
  const tries = [...new Set(jours)].sort();
  let plusLongue = 0;
  let suite = 0;
  let precedent: string | undefined;

  for (const jour of tries) {
    const enchaine =
      precedent !== undefined &&
      jourEnDateUtc(jour).getTime() - jourEnDateUtc(precedent).getTime() === JOUR_MS;
    suite = enchaine ? suite + 1 : 1;
    plusLongue = Math.max(plusLongue, suite);
    precedent = jour;
  }

  const dernier = tries.at(-1);
  const ecartAAujourdhui =
    dernier === undefined
      ? Infinity
      : (jourEnDateUtc(aujourdhui).getTime() - jourEnDateUtc(dernier).getTime()) / JOUR_MS;

  return { enCours: ecartAAujourdhui <= 1 ? suite : 0, plusLongue };
}

export function statsDeDemo(
  corpus: InputDuCorpus[],
  maintenant: Date,
  fuseau: string,
): StatsDeDemo {
  const jours: string[] = [];
  let xp = 0;

  for (const input of corpus) {
    for (const atom of input.atoms) {
      atom.historique.forEach(([joursEcoules, note], rang) => {
        const notePrecedente = rang > 0 ? atom.historique[rang - 1]?.[1] : undefined;
        xp += xpDuPassage(notePrecedente === "AGAIN", note !== "AGAIN");
        jours.push(jourLocal(new Date(maintenant.getTime() - joursEcoules * JOUR_MS), fuseau));
      });
    }
  }

  const aujourdhui = jourLocal(maintenant, fuseau);
  const { enCours, plusLongue } = series(jours, aujourdhui);
  const dernierJour = [...jours].sort().at(-1);

  return {
    xp,
    level: progressionPourXp(xp).niveau,
    currentStreak: enCours,
    longestStreak: plusLongue,
    lastReviewedOn: dernierJour ? jourEnDateUtc(dernierJour) : null,
  };
}
