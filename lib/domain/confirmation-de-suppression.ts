import type { LangueDuProduit } from "./langue-du-produit";

/**
 * Ce qu'il faut taper pour effacer son compte. Une case se coche sans lire ;
 * recopier un mot oblige à regarder ce qu'on fait.
 *
 * Ici et non dans la Server Action : l'écran en a besoin aussi, et un fichier
 * `"use server"` n'exporte que des fonctions async. Le mot suit la langue de
 * l'écran.
 */

export const MOT_DE_CONFIRMATION: Record<LangueDuProduit, string> = {
  FR: "supprimer",
  EN: "delete",
};

/**
 * La saisie confirme-t-elle, dans cette langue ? Casse et espaces autour sont
 * tolérés : un clavier mobile ajoute souvent une majuscule et une espace finale.
 * Seul le mot de la langue de l'écran confirme.
 */
export function confirmationValide(saisie: string, langue: LangueDuProduit): boolean {
  return saisie.trim().toLowerCase() === MOT_DE_CONFIRMATION[langue];
}
