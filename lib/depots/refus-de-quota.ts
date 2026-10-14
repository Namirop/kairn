import type { TraduireLesRefus } from "@/lib/depots/bornes-du-depot";
import { textesDesRefus } from "@/lib/depots/textes-des-refus";

/**
 * La cause d'un refus de quota, partagée par le dépôt et le redécoupage. Chaque
 * cause a son message : attendre une minute et attendre le mois prochain ne
 * demandent pas la même chose.
 */
export type MotifDeRefus = "concepts" | "depots" | "debit";

/**
 * Le message d'un refus de quota.
 *
 * Le plafond est reçu, car il dépend du plan du compte. Le message dit « autour
 * de » : un dépôt passe tant qu'il reste une place, et le dernier peut dépasser
 * le plafond. Il ne dit pas quand le quota repart, la date dépend du compte et
 * l'écran l'ajoute.
 *
 * `quota` distingue la limite de la période (des semaines) de celle du débit
 * (des secondes).
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
