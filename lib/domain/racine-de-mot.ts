/**
 * La racine grossière d'un mot, pour comparer deux textes sans buter sur les
 * accords : on coupe une terminaison connue et on s'arrête là (« exécution »,
 * « exécutent » → `execut`). Pas de la lemmatisation.
 *
 * Faite pour comparer deux phrases voisines du même modèle (voir
 * `etalon-utile.ts`), pas pour une recherche ou un index : elle rapproche des
 * mots sans lien (« est » et « et »). L'anglais passe par la même liste.
 */

/**
 * Les terminaisons, de la plus longue à la plus courte. La première qui tombe
 * est la seule qu'on coupe : on ne dérive pas en cascade.
 */
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

/**
 * En deçà, on ne coupe plus : une racine vide ne compare rien. Bas exprès, pour
 * que « le »/« les » ou « de »/« des » se rejoignent.
 */
const RACINE_MINIMUM = 1;

/** Minuscules, sans accents : le reste de la coupe se fait sur de l'ASCII. */
function aplati(mot: string): string {
  return mot.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function racineDeMot(mot: string): string {
  const plat = aplati(mot);

  for (const terminaison of TERMINAISONS) {
    if (!plat.endsWith(terminaison)) continue;

    const racine = plat.slice(0, plat.length - terminaison.length);

    return racine.length >= RACINE_MINIMUM ? racine : plat;
  }

  return plat;
}
