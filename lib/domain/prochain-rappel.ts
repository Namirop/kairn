import { localHour } from "./local-day";

/**
 * Quand tombera le prochain rappel quotidien.
 *
 * L'heure est un réglage local — « 19 h chez moi » —, donc la question « est-ce
 * pour aujourd'hui ou pour demain » se tranche sur l'heure locale et pas sur
 * l'instant UTC. À 20 h à Paris, un rappel réglé sur 19 h est déjà passé ; à la
 * même seconde, il ne l'est pas encore à Lisbonne.
 *
 * L'heure pile appartient au passé : à 19 h 30, le rappel de 19 h est parti.
 * `localHour` rendant l'heure entamée, la comparaison stricte suffit à le dire.
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
