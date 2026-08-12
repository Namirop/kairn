/**
 * Ce qu'il faut taper pour effacer son compte.
 *
 * Pas une case à cocher : une case se coche sans lire. Recopier un mot demande
 * de regarder ce qu'on est en train de faire, et c'est le seul frein
 * proportionné à une action qu'on ne peut pas défaire.
 *
 * La règle vit ici plutôt que dans la Server Action parce qu'elle est lue des
 * deux côtés — le serveur pour refuser, l'écran pour dire quoi taper — et qu'un
 * fichier `"use server"` ne peut rien exporter d'autre que des fonctions async.
 * Elle est de toute façon à sa place : c'est une règle, pas un accès données.
 */

export const MOT_DE_CONFIRMATION = "supprimer";

/**
 * La saisie confirme-t-elle ?
 *
 * On tolère la casse et les espaces autour : quelqu'un qui recopie sur mobile
 * récolte souvent une majuscule automatique et une espace finale, et le refuser
 * ferait passer une hésitation légitime pour une faute de frappe. Ce qui compte
 * est que le mot ait été tapé, pas la façon dont le clavier l'a rendu.
 */
export function confirmationValide(saisie: string): boolean {
  return saisie.trim().toLowerCase() === MOT_DE_CONFIRMATION;
}
