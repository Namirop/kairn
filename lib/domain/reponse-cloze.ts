/**
 * La vérification d'un texte à trou, sans appel modèle : la tolérance est payée
 * à la génération, sous forme de formes acceptées.
 *
 * On absorbe la casse, les accents, la ponctuation, un déterminant de tête et
 * une faute de frappe sur un mot assez long. Pas un mot court à une lettre près
 * (« ver » et « vert » diffèrent), ni un mot de contenu manquant.
 *
 * En cas d'échec, l'écran montre le terme attendu et laisse dire « je l'avais ».
 */

import { motsAplatis } from "./mots-normalises";

/** Le trou dans la phrase. Trois soulignés : ça se lit, et ça se retape. */
export const TROU = "___";

/**
 * Longueur maximale d'une saisie. La plus longue forme acceptée fait 23 signes :
 * ce plafond n'arbitre pas une réponse, il empêche qu'un paragraphe recopié dans
 * le trou de l'énoncé pousse la carte hors de l'écran.
 */
export const LONGUEUR_MAX_SAISIE = 64;

/**
 * Longueurs à partir desquelles une faute de frappe est tolérée. Sous six
 * lettres, une lettre change le sens plus souvent qu'elle ne trahit un doigt
 * qui glisse.
 */
const LONGUEUR_UN_ECART = 6;
const LONGUEUR_DEUX_ECARTS = 10;

/**
 * Ce qu'on ramène à la même chose avant de comparer. Trait d'union et
 * apostrophe deviennent des espaces : « porte greffe » vaut « porte-greffe ».
 */
export function normaliserReponse(texte: string): string {
  return motsAplatis(texte);
}

/**
 * Les déterminants qu'on ôte en tête avant de comparer : l'article vient de la
 * phrase, pas de la connaissance vérifiée. Un seul, et seulement s'il reste un
 * mot derrière, car le terme attendu peut être un article.
 */
const DETERMINANTS = new Set([
  "le",
  "la",
  "les",
  "l",
  "un",
  "une",
  "des",
  "du",
  "de",
  "d",
  "au",
  "aux",
  "the",
  "a",
  "an",
]);

/** Les mots d'une réponse normalisée, son déterminant de tête ôté. */
function motsUtiles(texte: string): string[] {
  const mots = texte.split(" ").filter((mot) => mot !== "");

  if (mots.length > 1 && DETERMINANTS.has(mots[0] ?? "")) return mots.slice(1);

  return mots;
}

/** Le nombre de caractères de travers qu'on laisse passer sur ce mot. */
export function ecartTolere(mot: string): number {
  if (mot.length >= LONGUEUR_DEUX_ECARTS) return 2;
  if (mot.length >= LONGUEUR_UN_ECART) return 1;

  return 0;
}

/** Distance d'édition, en insertions, suppressions et substitutions. */
function distance(attendu: string, saisi: string): number {
  let precedente = Array.from({ length: saisi.length + 1 }, (_, colonne) => colonne);

  for (let ligne = 1; ligne <= attendu.length; ligne += 1) {
    const courante = [ligne];

    for (let colonne = 1; colonne <= saisi.length; colonne += 1) {
      const cout = attendu[ligne - 1] === saisi[colonne - 1] ? 0 : 1;

      courante.push(
        Math.min(
          (precedente[colonne] ?? 0) + 1,
          (courante[colonne - 1] ?? 0) + 1,
          (precedente[colonne - 1] ?? 0) + cout,
        ),
      );
    }

    precedente = courante;
  }

  return precedente[saisi.length] ?? attendu.length;
}

/** Deux textes normalisés, mot à mot, chacun dans sa propre tolérance. */
function correspond(attendu: string, saisi: string): boolean {
  const motsAttendus = motsUtiles(attendu);
  const motsSaisis = motsUtiles(saisi);

  if (motsAttendus.length === 0) return false;
  if (motsAttendus.length !== motsSaisis.length) return false;

  return motsAttendus.every(
    (mot, rang) => distance(mot, motsSaisis[rang] ?? "") <= ecartTolere(mot),
  );
}

/**
 * La saisie vaut-elle l'une des formes acceptées ? Une saisie vide ne vaut
 * rien, même face à une forme acceptée vide.
 */
export function reponseAcceptee(saisie: string, formes: string[]): boolean {
  const saisi = normaliserReponse(saisie);

  if (saisi === "") return false;

  return formes.some((forme) => correspond(normaliserReponse(forme), saisi));
}
