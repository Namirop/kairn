import { ROUTES } from "@/lib/auth/routes";
import type { Langue } from "@/lib/db/types";

/**
 * Les adresses qui portent leur langue : seulement les pages publiques, celles
 * qu'on partage et qu'un moteur indexe. L'application suit le réglage du
 * compte.
 *
 * `/en` est servi par le middleware à la même page — il n'y a pas de dossier
 * `en/` dans `app/`. Le français n'a pas de préfixe ; `/fr` ne fait que poser le
 * choix avant d'y renvoyer.
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

/** Posé par le middleware : la page publique servie, sans son préfixe de langue. */
export const EN_TETE_DU_CHEMIN = "x-kairn-chemin";

/**
 * Les deux versions d'une page publique, pour `alternates.languages` : un
 * moteur sert alors à chacun la sienne au lieu de les tenir pour un doublon.
 */
export function versionsDeLaPage(chemin: string): Record<string, string> {
  return {
    fr: adressePublique(chemin, "FR"),
    en: adressePublique(chemin, "EN"),
    "x-default": adressePublique(chemin, "FR"),
  };
}
