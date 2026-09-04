/**
 * La racine grossière d'un mot, pour comparer deux textes sans buter sur les
 * accords.
 *
 * Ce n'est pas de la lemmatisation et ça n'essaie pas de l'être : on coupe une
 * terminaison connue et on s'arrête là. « exécution », « exécute », « exécuter »
 * et « exécutent » se rejoignent sur `execut` ; « mesure » et « mesurés » sur
 * `mesur`. C'est tout ce qu'on lui demande.
 *
 * **Ce qu'elle sert.** Deux textes écrits par le même modèle, dans la même
 * langue, à propos du même concept, qu'on veut savoir identiques ou non. Un
 * pluriel de différence ne devrait pas faire passer une recopie pour une
 * explication. Voir `etalon-utile.ts`.
 *
 * **Ce qu'elle ne sert pas.** Une recherche, un index, une comparaison entre
 * textes d'origines différentes : elle rapproche des mots sans lien — « est » et
 * « et » finissent au même endroit — et c'est sans conséquence tant qu'on
 * compare deux phrases voisines, pas un corpus.
 *
 * L'anglais est traité par la même liste, faute d'y avoir grand-chose à couper :
 * le pluriel et le participe présent suffisent en pratique.
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
 * En deçà, on ne coupe plus : une racine vide ne compare rien.
 *
 * C'est le seul plancher, et il est bas exprès. Les mots outils courts portent
 * les accords qui font échouer une comparaison de suite de mots — « le » contre
 * « les », « de » contre « des », « ce » contre « ces » —, et c'est justement
 * ceux-là qu'on veut voir se rejoindre. Le prix est que « est » et « et »
 * finissent au même endroit ; sur deux phrases voisines, c'est sans effet.
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
