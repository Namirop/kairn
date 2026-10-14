import { localHour } from "./local-day";

/**
 * Quand tombera le prochain rappel quotidien. L'heure est un réglage local, donc
 * « aujourd'hui ou demain » se tranche sur l'heure locale, pas sur l'UTC.
 *
 * L'heure entamée appartient au passé : à 19 h 30, le rappel de 19 h est parti,
 * d'où la comparaison stricte avec `localHour`.
 */
export type ProchainRappel = { jour: "aujourdhui" | "demain"; heure: number };

export function prochainRappel(
  maintenant: Date,
  heureDuRappel: number,
  fuseau: string,
): ProchainRappel {
  const heure = Math.min(Math.max(Math.floor(heureDuRappel), 0), 23);

  return { jour: localHour(maintenant, fuseau) < heure ? "aujourdhui" : "demain", heure };
}
