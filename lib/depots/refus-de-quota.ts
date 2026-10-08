import type { TraduireLesRefus } from "@/lib/depots/bornes-du-depot";
import { textesDesRefus } from "@/lib/depots/textes-des-refus";

/**
 * Ce qu'un refus de quota dit.
 *
 * Chacun nomme sa cause : « trop de dépôts » et « assez de concepts pour ce
 * mois-ci » n'appellent pas la même conduite, et un message unique ferait
 * attendre trois semaines quelqu'un qui n'a qu'à patienter une minute.
 *
 * Partagé par le dépôt et par le redécoupage — les deux paient une extraction,
 * donc les deux prennent une place, donc les deux la refusent dans les mêmes
 * termes.
 */
export type MotifDeRefus = "concepts" | "depots" | "debit";

/**
 * Le message d'un refus, dit à l'utilisateur.
 *
 * Le plafond est reçu, plus lu : il dépend du plan du compte depuis que le
 * paiement existe, et une constante annoncerait cinquante concepts à quelqu'un
 * qui en a cinq cents. Il vient du refus lui-même, qui le porte depuis la décision.
 *
 * « Autour de », et c'est exact. Un dépôt est autorisé tant qu'il reste une
 * place, puis rend ce qu'il rend : le dernier de la période peut retenir huit
 * concepts sur une place. Annoncer un nombre rond que le produit dépasse d'un
 * quart, c'était afficher un plafond qui est en fait un plancher.
 *
 * Aucun message ne dit quand ça repart : la date dépend du compte, et l'écran
 * qui la connaît l'ajoute. Une phrase qui dirait « demain » serait fausse de
 * trois semaines pour la plupart des gens.
 *
 * `quota` distingue la limite de la période de celle du débit : l'une se compte
 * en semaines, l'autre en secondes.
 *
 * Les phrases sont `depots.refus.quota`, dites dans la langue de `t` — le
 * français par défaut, pour les scripts qui n'ont pas de requête.
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
