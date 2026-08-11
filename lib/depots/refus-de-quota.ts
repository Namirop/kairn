import { CONCEPTS_PAR_JOUR } from "@/lib/db/quota-depots";

/**
 * Ce qu'un refus de quota dit.
 *
 * Chacun nomme sa cause : « trop de dépôts » et « assez de concepts pour
 * aujourd'hui » n'appellent pas la même conduite, et un message unique ferait
 * attendre demain quelqu'un qui n'a qu'à patienter une minute.
 *
 * Partagé par le dépôt et par le redécoupage — les deux paient une extraction,
 * donc les deux prennent une place, donc les deux la refusent dans les mêmes
 * termes.
 */
export const MOTIFS_DE_REFUS = {
  concepts: `Tu as retenu tout ce que la journée permet, ${CONCEPTS_PAR_JOUR} concepts. Ça repart demain.`,
  depots: "Tu as fait tous les dépôts de la journée. Ça repart demain.",
  debit: "Trop de dépôts coup sur coup. Laisse passer une minute.",
} as const;

export type MotifDeRefus = keyof typeof MOTIFS_DE_REFUS;

/** Un refus de place, dit à l'utilisateur. `quota` distingue le jour du débit. */
export function refusDeQuota(motif: MotifDeRefus): { motif: string; quota: boolean } {
  return { motif: MOTIFS_DE_REFUS[motif], quota: motif !== "debit" };
}
