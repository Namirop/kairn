import type { Langue } from "@/lib/db/types";

/**
 * Des enums de la base (`FR`, `EN`) aux étiquettes BCP 47 de next-intl et
 * `Intl`. Rien de serveur ici : un composant client peut l'importer.
 */

export const LANGUES: readonly Langue[] = ["FR", "EN"];

export const LOCALE: Record<Langue, "fr" | "en"> = { FR: "fr", EN: "en" };

export const ETIQUETTE_INTL: Record<Langue, string> = { FR: "fr-FR", EN: "en-US" };

export function langueDeLocale(locale: string): Langue {
  return locale === "en" ? "EN" : "FR";
}

/** Le choix explicite, retenu un an. Sans compte seulement : inscrit, le réglage fait foi. */
export const COOKIE_DE_LANGUE = "kairn-langue";

/** Posé par le proxy sur une page publique dont l'adresse dit la langue. */
export const EN_TETE_DE_LANGUE = "x-kairn-langue";
