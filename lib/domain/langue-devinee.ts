import type { LangueDuProduit } from "./langue-du-produit";

/**
 * La langue dans laquelle parler à quelqu'un qu'on ne connaît pas encore.
 *
 * D'abord le choix explicite gardé en cookie, puis `Accept-Language`, qui dit
 * ce que le navigateur lit et non le pays d'où l'on se connecte.
 *
 * Le français par défaut quand rien ne tranche : c'est la langue d'origine, la
 * seule où chaque texte a été relu par quelqu'un qui la parle.
 */

const LANGUES: readonly LangueDuProduit[] = ["FR", "EN"];

/** « fr », « EN », « en-GB » : ce qu'un cookie ou une adresse peut porter. */
export function langueDepuisCode(code: string | null | undefined): LangueDuProduit | null {
  // La sous-étiquette principale entière : « frr », le frison, n'est pas « fr ».
  const prefixe = code?.trim().split(/[-_]/)[0]?.toUpperCase();

  return LANGUES.find((langue) => langue === prefixe) ?? null;
}

type Preference = { langue: string; poids: number; rang: number };

function lirePreference(morceau: string, rang: number): Preference | null {
  const [etiquette, ...parametres] = morceau.trim().split(";");
  const langue = etiquette?.trim().toLowerCase() ?? "";

  if (langue.length === 0) return null;

  const q = parametres.map((p) => p.trim()).find((p) => p.startsWith("q="));
  const poids = q ? Number(q.slice(2)) : 1;

  return Number.isFinite(poids) && poids > 0 ? { langue, poids, rang } : null;
}

/**
 * La première langue du produit dans l'ordre de préférence du navigateur.
 *
 * Pas seulement la première de la liste : « pt-PT, en;q=0.8 » doit donner
 * l'anglais, pas le français par défaut. À poids égal, l'ordre d'écriture
 * départage.
 */
export function langueDuNavigateur(
  acceptLanguage: string | null | undefined,
): LangueDuProduit | null {
  const preferences = (acceptLanguage ?? "")
    .split(",")
    .map(lirePreference)
    .filter((preference) => preference !== null)
    .sort((a, b) => b.poids - a.poids || a.rang - b.rang);

  for (const { langue } of preferences) {
    const trouvee = langueDepuisCode(langue);

    if (trouvee) return trouvee;
  }

  return null;
}

export function langueDevinee(sources: {
  choix: string | null | undefined;
  acceptLanguage: string | null | undefined;
}): LangueDuProduit {
  return langueDepuisCode(sources.choix) ?? langueDuNavigateur(sources.acceptLanguage) ?? "FR";
}
