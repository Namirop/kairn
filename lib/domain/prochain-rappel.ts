import { heureLocale } from "./jour-local";

/**
 * Quand tombera le prochain rappel quotidien, tranché sur l'heure locale. La
 * comparaison est stricte : à 19 h 30, le rappel de 19 h est parti.
 */
export type ProchainRappel = { jour: "aujourdhui" | "demain"; heure: number };

export function prochainRappel(
  maintenant: Date,
  heureDuRappel: number,
  fuseau: string,
): ProchainRappel {
  const heure = Math.min(Math.max(Math.floor(heureDuRappel), 0), 23);

  return { jour: heureLocale(maintenant, fuseau) < heure ? "aujourdhui" : "demain", heure };
}
