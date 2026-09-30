/**
 * La longueur du fondu entre deux panneaux, et pourquoi elle n'est pas fixe.
 *
 * **Une strate ne peut pas absorber n'importe quel écart.** En production elle
 * sépare le papier et l'ombre — deux valeurs voisines de six centièmes — et
 * cinquante pixels suffisent : on voit une coupe de roche, et elle sépare. Entre
 * l'ombre et la roche, l'écart est douze fois plus grand, et la même bande
 * devient une coupure nette : la strate cesse d'être une transition pour devenir
 * une bordure décorative posée entre deux blocs.
 *
 * Monter la hauteur de la bande ne répare rien — une grande coupure reste une
 * coupure. Ce qui répare, c'est de **faire changer la couleur avant que la
 * strate arrive** : un fondu occupe le haut du passage, les veines se posent
 * dans le dernier tiers là où les deux valeurs sont déjà voisines, et la strate
 * redevient ce qu'elle doit être — une ligne de crête, pas le changement
 * lui-même.
 *
 * **Le corollaire compte autant.** Entre deux surfaces voisines, le fondu vaut
 * zéro. Sans ce zéro, le passage papier → ombre se dissout complètement et deux
 * sections consécutives se lisent comme une seule — c'est exactement ce qui
 * s'est vu sur la maquette du 30/09 entre « Dépose quelque chose » et « Trois
 * gestes ». La séparation de la production ne change donc pas d'aspect : elle
 * n'a jamais eu besoin de fondu, et elle n'en reçoit pas.
 *
 * Fonction pure : elle rend une hauteur, jamais un style.
 */

import type { Surface } from "@/lib/domain/valeur-de-surface";
import { VALEURS } from "@/lib/domain/valeur-de-surface";

/**
 * En deçà de cet écart, deux surfaces se séparent par la seule strate.
 *
 * Six centièmes séparent le papier de l'ombre, et c'est le cas que la
 * production sert depuis toujours sans qu'il ait jamais paru brutal. Le seuil
 * est posé juste au-dessus : ce qui se passait bien continue de se passer
 * pareil, et le fondu ne s'ouvre que sur les écarts qui le demandent.
 */
export const ECART_SANS_FONDU = 10;

/** Au-delà de cet écart, le fondu ne grandit plus : il est déjà assez long. */
const ECART_PLEIN = 70;

/** Les deux bornes, en pixels. Zéro, ou de quoi faire tourner une couleur. */
const FONDU_MINIMUM = 72;
const FONDU_MAXIMUM = 220;

/**
 * De quelle hauteur la couleur doit tourner avant que la strate se pose.
 *
 * Zéro veut dire « pas de fondu du tout », et c'est une réponse, pas un défaut :
 * deux surfaces voisines n'ont rien à fondre, et leur en donner ferait
 * disparaître la séparation.
 */
export function hauteurDuFondu(de: Surface, vers: Surface): number {
  const ecart = Math.abs(VALEURS[de] - VALEURS[vers]);

  if (ecart <= ECART_SANS_FONDU) return 0;

  const part = Math.min((ecart - ECART_SANS_FONDU) / (ECART_PLEIN - ECART_SANS_FONDU), 1);

  return Math.round(FONDU_MINIMUM + (FONDU_MAXIMUM - FONDU_MINIMUM) * part);
}
