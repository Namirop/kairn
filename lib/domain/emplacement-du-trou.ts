import { tirageDe } from "./tirage-deterministe";

/**
 * Quelle facette porte le texte à trou du lot : le serveur décide, la grammaire
 * l'impose.
 *
 * Laissée au prompt, la consigne « au moins un CLOZE » cède dès qu'une autre
 * consigne tire ailleurs (41 lots sur 80 sans texte à trou). Or c'est le seul
 * format qui force une récupération en mémoire ; une question binaire se
 * réussit une fois sur deux au hasard. Le modèle garde le choix du format sur
 * les trois autres questions.
 *
 * Tirage semé : une régénération ne déplace pas le trou, et le rejeu du banc
 * reste comparable.
 */

/** Les quatre facettes, dans l'ordre servi. Toutes ouvrent le texte à trou. */
export const FACETTES_DU_LOT = ["recognition", "mechanism", "boundary", "application"] as const;

export type FacetteDuLot = (typeof FACETTES_DU_LOT)[number];

/**
 * La facette qui portera le trou, pour un envoi entier : la grammaire est
 * compilée une fois par appel et vaut pour tous les concepts qu'il porte. La
 * graine est celle du premier concept du groupe, ce qui fait tourner
 * l'emplacement d'un appel à l'autre.
 */
export function emplacementDuTexteATrou(graine: string): FacetteDuLot {
  const rang = Math.floor(tirageDe(`${graine}:trou`)() * FACETTES_DU_LOT.length);

  return FACETTES_DU_LOT[Math.min(rang, FACETTES_DU_LOT.length - 1)] ?? "recognition";
}
