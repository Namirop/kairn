import type { Langue } from "@/lib/db/types";

/**
 * Les correspondances d'une langue du produit, en un seul endroit.
 *
 * La base nomme les langues comme ses autres enums, `FR` et `EN` ; next-intl et
 * `Intl` attendent des étiquettes BCP 47. Ce fichier n'importe rien de serveur :
 * un composant client peut s'en servir.
 */

export const LANGUES: readonly Langue[] = ["FR", "EN"];

/** L'étiquette que next-intl porte comme `locale`. */
export const LOCALE: Record<Langue, "fr" | "en"> = { FR: "fr", EN: "en" };

/** L'étiquette passée à `Intl` pour les dates et les nombres. */
export const ETIQUETTE_INTL: Record<Langue, string> = { FR: "fr-FR", EN: "en-US" };

export function langueDeLocale(locale: string): Langue {
  return locale === "en" ? "EN" : "FR";
}

/**
 * Le choix explicite d'une langue, retenu un an. Seulement sans compte : une
 * fois inscrit, c'est le réglage qui fait foi.
 */
export const COOKIE_DE_LANGUE = "kairn-langue";

/** Posé par le middleware sur une page publique dont l'adresse dit la langue. */
export const EN_TETE_DE_LANGUE = "x-kairn-langue";
