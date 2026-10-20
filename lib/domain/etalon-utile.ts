import { racineDeMot } from "./racine-de-mot";

/**
 * L'étalon dit-il autre chose que la bonne option, déjà surlignée sur un format
 * à choix ? S'il est contenu dans l'option, non ; s'il ne la contient pas, on le
 * montre, car se taire à tort est pire ; sinon, la longueur du reste tranche.
 */

/**
 * Les mots ajoutables sans rien dire (« Elle doit » en fait deux). En production,
 * une seule question tombe entre quatre et six : le seuil n'est pas sur une falaise.
 */
const MOTS_EN_PLUS = 3;

/**
 * Réduit aux racines, pour qu'un pluriel ou un temps changé reste une redite.
 * Une paraphrase franche n'est pas rattrapée : le prompt demande la recopie.
 */
function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter((mot) => mot !== "")
    .map(racineDeMot)
    .join(" ");
}

/** Aux mots entiers : sans les espaces, « art » serait dans « quatre parties ». */
function contient(grand: string, petit: string): boolean {
  return ` ${grand} `.includes(` ${petit} `);
}

function mots(texte: string): number {
  return texte.length === 0 ? 0 : texte.split(" ").length;
}

export function etalonUtile(answerKey: string, bonneOption: string): boolean {
  const etalon = normaliser(answerKey);
  const option = normaliser(bonneOption);

  if (etalon.length === 0) return false;
  // Sans option, pas de redite possible : c'est le seul texte de réponse.
  if (option.length === 0) return true;

  if (contient(option, etalon)) return false;
  if (!contient(etalon, option)) return true;

  return mots(etalon) - mots(option) > MOTS_EN_PLUS;
}
