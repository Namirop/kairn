import type { LangueDuProduit } from "./langue-du-produit";

/**
 * La langue d'un visiteur inconnu : le cookie, puis `Accept-Language` (ce que le
 * navigateur lit, pas le pays). Le français par défaut : seule langue où chaque
 * texte a été relu par quelqu'un qui la parle.
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

/** Pas seulement la première de la liste : « pt-PT, en;q=0.8 » doit donner l'anglais. */
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
