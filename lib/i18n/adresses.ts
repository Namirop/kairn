import { ROUTES } from "@/lib/auth/routes";
import type { Langue } from "@/lib/db/types";

/**
 * Seules les pages publiques (partagées, indexées) portent leur langue dans
 * l'adresse ; l'application suit le réglage du compte. Le proxy sert `/en` sur
 * la même page, sans dossier `en/` dans `app/`. Le français n'a pas de
 * préfixe : `/fr` pose le choix puis y renvoie.
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

/** `/tarifs` → `/en/tarifs`. */
export function adressePublique(chemin: string, langue: Langue): string {
  if (langue === "FR") return chemin;

  return chemin === ROUTES.accueil ? PREFIXE_ANGLAIS : `${PREFIXE_ANGLAIS}${chemin}`;
}

/** Posé par le proxy : la page publique servie, sans son préfixe de langue. */
export const EN_TETE_DU_CHEMIN = "x-kairn-chemin";

/** Pour `alternates.languages` : sans quoi un moteur tient les deux pour un doublon. */
export function versionsDeLaPage(chemin: string): Record<string, string> {
  return {
    fr: adressePublique(chemin, "FR"),
    en: adressePublique(chemin, "EN"),
    "x-default": adressePublique(chemin, "FR"),
  };
}
