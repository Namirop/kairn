import { tirageDe } from "./tirage-deterministe";

/**
 * Quelle facette porte le texte à trou du lot : le serveur décide, la grammaire
 * l'impose. Laissé au prompt, « au moins un CLOZE » cédait (41 lots sur 80 sans
 * trou), or c'est le seul format qui force un rappel en mémoire. Tirage semé :
 * une régénération ne déplace pas le trou et le banc reste rejouable.
 */

/** Dans l'ordre servi. Toutes ouvrent le texte à trou. */
export const FACETTES_DU_LOT = ["recognition", "mechanism", "boundary", "application"] as const;

export type FacetteDuLot = (typeof FACETTES_DU_LOT)[number];

/**
 * Une facette pour l'envoi entier : la grammaire est compilée une fois par appel.
 * La graine du premier concept fait tourner l'emplacement d'un appel à l'autre.
 */
export function emplacementDuTexteATrou(graine: string): FacetteDuLot {
  const rang = Math.floor(tirageDe(`${graine}:trou`)() * FACETTES_DU_LOT.length);

  return FACETTES_DU_LOT[Math.min(rang, FACETTES_DU_LOT.length - 1)] ?? "recognition";
}
