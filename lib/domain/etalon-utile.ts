import { racineDeMot } from "./racine-de-mot";

/**
 * L'étalon dit-il autre chose que la bonne option ?
 *
 * Sur un format à choix, la bonne option est déjà surlignée : un étalon qui la
 * redit occupe un bloc pour rien. Utilisé par la correction d'un choix et par
 * ce qui suit une pierre jetée.
 *
 * Trois épreuves, dans cet ordre :
 *
 * 1. L'option contient l'étalon : il n'ajoute rien (un vrai ou faux dont
 *    l'étalon est « Faux »).
 * 2. L'étalon ne contient pas l'option : on le montre. Deviner une
 *    reformulation coûterait des faux négatifs, et se taire à tort est pire.
 * 3. L'étalon contient l'option : la longueur du reste tranche.
 */

/**
 * Le nombre de mots qu'on peut ajouter à une option sans rien dire (« Elle
 * doit » en fait deux). Sur les questions de production, une seule tombe
 * entre quatre et six mots ajoutés : le seuil n'est pas sur une falaise.
 */
const MOTS_EN_PLUS = 3;

/**
 * Casse, ponctuation, accords et espaces effacés : il ne reste que des racines,
 * pour qu'une recopie qui change un pluriel ou un temps reste une redite. Les
 * deux textes viennent de la même génération, deux racines confondues y sont
 * presque toujours le même mot.
 *
 * Une paraphrase franche n'est pas rattrapée : c'est le prompt qui demande
 * une recopie mot pour mot quand il n'y a aucune cause à énoncer.
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

/**
 * Le petit tient-il dans le grand, aux mots entiers ? Sans les espaces de
 * garde, « art » se trouverait dans « quatre parties ».
 */
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
