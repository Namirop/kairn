/**
 * La vérification d'un texte à trou, sans appel modèle : la tolérance est payée
 * à la génération, en formes acceptées. On absorbe casse, accents, ponctuation,
 * un déterminant de tête et une faute de frappe sur un mot assez long.
 */

import { motsAplatis } from "./mots-normalises";

/** Trois soulignés : ça se lit, et ça se retape. */
export const TROU = "___";

/**
 * La plus longue forme acceptée fait 23 signes : ce plafond n'arbitre rien, il
 * empêche qu'un paragraphe collé pousse la carte hors de l'écran.
 */
export const LONGUEUR_MAX_SAISIE = 64;

/** Sous six lettres, une lettre change le sens plus souvent qu'elle ne trahit le doigt. */
const LONGUEUR_UN_ECART = 6;
const LONGUEUR_DEUX_ECARTS = 10;

/** « porte greffe » vaut « porte-greffe ». */
export function normaliserReponse(texte: string): string {
  return motsAplatis(texte);
}

/**
 * L'article vient de la phrase, pas de la connaissance. Un seul ôté, et
 * seulement s'il reste un mot derrière : le terme attendu peut être un article.
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

function motsUtiles(texte: string): string[] {
  const mots = texte.split(" ").filter((mot) => mot !== "");

  if (mots.length > 1 && DETERMINANTS.has(mots[0] ?? "")) return mots.slice(1);

  return mots;
}

export function ecartTolere(mot: string): number {
  if (mot.length >= LONGUEUR_DEUX_ECARTS) return 2;
  if (mot.length >= LONGUEUR_UN_ECART) return 1;

  return 0;
}

/** Distance de Levenshtein. */
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

/** Mot à mot, chacun dans sa propre tolérance. */
function correspond(attendu: string, saisi: string): boolean {
  const motsAttendus = motsUtiles(attendu);
  const motsSaisis = motsUtiles(saisi);

  if (motsAttendus.length === 0) return false;
  if (motsAttendus.length !== motsSaisis.length) return false;

  return motsAttendus.every(
    (mot, rang) => distance(mot, motsSaisis[rang] ?? "") <= ecartTolere(mot),
  );
}

/** Une saisie vide ne vaut rien, même face à une forme acceptée vide. */
export function reponseAcceptee(saisie: string, formes: string[]): boolean {
  const saisi = normaliserReponse(saisie);

  if (saisi === "") return false;

  return formes.some((forme) => correspond(normaliserReponse(forme), saisi));
}
