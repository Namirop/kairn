import { tirageDe } from "./tirage-deterministe";

/**
 * Quelle facette porte le texte à trou du lot. **Le serveur décide, la
 * grammaire l'impose.**
 *
 * « Une des quatre questions au moins est un CLOZE » était une consigne de
 * prompt, et elle a tenu tant que rien ne tirait dans l'autre sens. Le passage
 * du 19h38 a montré ce qu'elle valait sous pression : en ajoutant une consigne
 * sur le vrai ou faux, `TRUE_FALSE` est passé de 25 % à 54 % des questions et
 * **41 lots sur 80 se sont retrouvés sans aucun texte à trou**, contre 12 sur
 * 125 auparavant.
 *
 * Ça compte parce qu'une question binaire vaut un bit et se réussit une fois sur
 * deux au hasard, alors que le texte à trou est le seul format du produit qui
 * force une récupération en mémoire. C'est lui qui fait tenir un souvenir, et
 * c'est lui qui disparaissait en premier.
 *
 * Le modèle garde le choix du format sur les trois autres questions.
 *
 * L'emplacement est tiré d'une graine, comme la position des options et la cible
 * du vrai ou faux : deux régénérations d'un même concept ne le déplacent pas, et
 * le rejeu du banc reste comparable.
 */

/** Les quatre facettes, dans l'ordre servi. Toutes ouvrent le texte à trou. */
export const FACETTES_DU_LOT = ["recognition", "mechanism", "boundary", "application"] as const;

export type FacetteDuLot = (typeof FACETTES_DU_LOT)[number];

/**
 * La facette qui portera le trou, pour un envoi entier.
 *
 * Un envoi et non un concept : la contrainte vit dans la grammaire, qui est
 * compilée une fois par appel et vaut donc pour les trois concepts qu'il porte.
 * La graine est celle du premier concept du groupe — l'emplacement tourne d'un
 * appel à l'autre, ce qui suffit à ce qu'une facette ne monopolise pas le
 * format.
 */
export function emplacementDuTexteATrou(graine: string): FacetteDuLot {
  const rang = Math.floor(tirageDe(`${graine}:trou`)() * FACETTES_DU_LOT.length);

  return FACETTES_DU_LOT[Math.min(rang, FACETTES_DU_LOT.length - 1)] ?? "recognition";
}
