import { aplati } from "./texte-aplati";

/**
 * Une racine grossière : une terminaison coupée, pas de lemmatisation. Faite
 * pour comparer deux phrases voisines (`etalon-utile.ts`), pas pour un index :
 * elle rapproche « est » et « et ». L'anglais passe par la même liste.
 */

/** De la plus longue à la plus courte ; seule la première qui tombe est coupée. */
const TERMINAISONS = [
  "issements",
  "issement",
  "ements",
  "ement",
  "aient",
  "ations",
  "ation",
  "ions",
  "ion",
  "antes",
  "ants",
  "ante",
  "ant",
  "ent",
  "eurs",
  "euse",
  "eur",
  "ing",
  "ees",
  "ee",
  "es",
  "er",
  "ez",
  "e",
  "s",
] as const;

/** Bas exprès, pour que « le »/« les » ou « de »/« des » se rejoignent. */
const RACINE_MINIMUM = 1;

export function racineDeMot(mot: string): string {
  // Minuscules, sans accents : le reste de la coupe se fait sur de l'ASCII.
  const plat = aplati(mot);

  for (const terminaison of TERMINAISONS) {
    if (!plat.endsWith(terminaison)) continue;

    const racine = plat.slice(0, plat.length - terminaison.length);

    return racine.length >= RACINE_MINIMUM ? racine : plat;
  }

  return plat;
}
