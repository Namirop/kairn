/**
 * L'étalon dit-il autre chose que la bonne option ?
 *
 * Sur un format à choix, la bonne option est déjà surlignée à l'écran. Un
 * étalon qui la reformule n'apprend rien : il occupe un bloc entier, sous un
 * intitulé qui promet un pourquoi, pour redire le mot qu'on vient de lire deux
 * lignes plus haut. Une explication, elle, vaut le bloc.
 *
 * La comparaison était l'égalité stricte, et c'est trop peu : un point final
 * suffisait à faire passer une redite pour une explication, et « Elle doit »
 * mis devant l'option aussi. Sur les trente-neuf questions à choix servies en
 * production, quatre étaient masquées ; quinze le sont maintenant.
 *
 * Trois épreuves, dans cet ordre :
 *
 * 1. L'option contient l'étalon → il n'ajoute rien, quelle que soit sa
 *    longueur. C'est le cas d'un vrai ou faux dont l'étalon est « Faux ».
 * 2. L'étalon ne contient pas l'option → il parle d'autre chose, on le montre.
 *    On ne cherche pas à juger une reformulation qui n'a aucun mot en commun :
 *    la deviner coûterait des faux négatifs, et se taire à tort est pire que
 *    parler à tort ici.
 * 3. L'étalon contient l'option → c'est la longueur du reste qui tranche.
 *
 * Partagé par la correction d'un choix et par ce qui suit une pierre jetée :
 * les deux montrent la bonne réponse, les deux ont la même question à trancher.
 */

/**
 * Le nombre de mots qu'on peut ajouter à une option sans rien dire.
 *
 * « Elle doit » en fait deux, « c'est bien celle qui » quatre. Le seuil se
 * cherche entre les amorces vides et les précisions courtes ; relevé sur les
 * questions de production, une seule s'assied entre quatre et six mots ajoutés,
 * donc la valeur ne repose pas sur une falaise.
 */
const MOTS_EN_PLUS = 3;

/**
 * Casse, ponctuation et espaces effacés : il ne reste que les mots.
 *
 * Les accents restent — les deux textes viennent de la même génération, dans la
 * même langue, et les effacer n'apporterait que des collisions.
 */
function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Le petit tient-il dans le grand, aux mots entiers ?
 *
 * Sans les espaces de garde, « art » se trouverait dans « quatre parties » et
 * un étalon serait masqué pour un fragment de mot.
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
  // Sans option à comparer, il n'y a pas de redite possible : c'est le seul
  // texte de réponse dont on dispose, il se montre.
  if (option.length === 0) return true;

  if (contient(option, etalon)) return false;
  if (!contient(etalon, option)) return true;

  return mots(etalon) - mots(option) > MOTS_EN_PLUS;
}
