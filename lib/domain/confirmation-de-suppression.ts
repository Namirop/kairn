import type { LangueDuProduit } from "./langue-du-produit";

/**
 * Le mot à taper pour effacer son compte : une case se coche sans lire. Ici et
 * non dans la Server Action, car l'écran en a besoin et un fichier
 * `"use server"` n'exporte que des fonctions async.
 */

export const MOT_DE_CONFIRMATION: Record<LangueDuProduit, string> = {
  FR: "supprimer",
  EN: "delete",
};

/** Casse et espaces tolérés : un clavier mobile ajoute majuscule et espace finale. */
export function confirmationValide(saisie: string, langue: LangueDuProduit): boolean {
  return saisie.trim().toLowerCase() === MOT_DE_CONFIRMATION[langue];
}
