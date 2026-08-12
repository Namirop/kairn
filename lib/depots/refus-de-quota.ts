import { CONCEPTS_PAR_PERIODE } from "@/lib/db/quota-depots";

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
export const MOTIFS_DE_REFUS = {
  // « Autour de », et c'est exact. Un dépôt est autorisé tant qu'il reste une
  // place, puis rend ce qu'il rend : le dernier de la période peut retenir huit
  // concepts sur une place. Annoncer un nombre rond que le produit dépasse d'un
  // quart, c'était afficher un plafond qui est en fait un plancher.
  //
  // Aucun des deux ne dit quand ça repart : la date dépend du compte, et
  // l'écran qui la connaît l'ajoute. Une phrase qui dirait « demain » serait
  // fausse de trois semaines pour la plupart des gens.
  concepts: `Tu as atteint la limite du mois, autour de ${CONCEPTS_PAR_PERIODE} concepts.`,
  depots: "Tu as fait tous les dépôts du mois.",
  debit: "Trop de dépôts coup sur coup. Laisse passer une minute.",
} as const;

export type MotifDeRefus = keyof typeof MOTIFS_DE_REFUS;

/** Un refus de place, dit à l'utilisateur. `quota` distingue le jour du débit. */
export function refusDeQuota(motif: MotifDeRefus): { motif: string; quota: boolean } {
  return { motif: MOTIFS_DE_REFUS[motif], quota: motif !== "debit" };
}
