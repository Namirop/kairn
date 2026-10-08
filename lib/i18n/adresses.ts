import { ROUTES } from "@/lib/auth/routes";
import type { Langue } from "@/lib/db/types";

/**
 * Les adresses qui portent leur langue.
 *
 * Seules les pages publiques en ont une : ce sont elles qu'on partage, qu'un
 * moteur indexe et qu'une vidéo cite. `/en` en est la version anglaise, servie
 * par le middleware à la même page — il n'y a pas de dossier `en/` dans `app/`.
 * Le français n'a pas de préfixe : c'est l'adresse historique, et `/fr` ne fait
 * que poser le choix avant d'y renvoyer.
 *
 * L'application, elle, n'en a pas. Elle suit le réglage du compte, et une
 * adresse comme `/aujourdhui` n'est jamais partagée.
 */
export const PAGES_PUBLIQUES: readonly string[] = [
  ROUTES.accueil,
  ROUTES.tarifs,
  ROUTES.confidentialite,
  ROUTES.mentionsLegales,
  "/desinscription",
];

export const PREFIXE_ANGLAIS = "/en";

export function estPagePublique(chemin: string): boolean {
  return PAGES_PUBLIQUES.includes(chemin);
}

/** L'adresse d'une page publique dans une langue : `/tarifs` → `/en/tarifs`. */
export function adressePublique(chemin: string, langue: Langue): string {
  if (langue === "FR") return chemin;

  return chemin === ROUTES.accueil ? PREFIXE_ANGLAIS : `${PREFIXE_ANGLAIS}${chemin}`;
}
