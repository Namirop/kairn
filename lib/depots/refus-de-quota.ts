import type { TraduireLesRefus } from "@/lib/depots/bornes-du-depot";
import { textesDesRefus } from "@/lib/depots/textes-des-refus";

/** Un message par cause : attendre une minute ou le mois prochain, ce n'est pas pareil. */
export type MotifDeRefus = "concepts" | "depots" | "debit";

/**
 * Le plafond dépend du plan. « Autour de » : le dernier dépôt peut dépasser. La
 * date de reprise dépend du compte, l'écran l'ajoute. `quota` sépare la période
 * (des semaines) du débit (des secondes).
 */
export function refusDeQuota(
  motif: MotifDeRefus,
  plafond: number,
  t: TraduireLesRefus = textesDesRefus(),
): { motif: string; quota: boolean } {
  const messages: Record<MotifDeRefus, string> = {
    concepts: t("quota.concepts", { plafond }),
    depots: t("quota.depots"),
    debit: t("quota.debit"),
  };

  return { motif: messages[motif], quota: motif !== "debit" };
}
