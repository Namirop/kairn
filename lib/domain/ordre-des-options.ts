import { tirageDe } from "./tirage-deterministe";

/**
 * L'ordre dans lequel les options d'un QCM sont montrées.
 *
 * Le modèle place la bonne réponse en premier 92 % du temps (52 QCM mesurés),
 * et FSRS lirait comme mémorisées les réussites de qui répond « la première ».
 * Une position aléatoire est une propriété de distribution, qu'un modèle ne
 * tient pas par consigne : c'est le serveur qui décide de l'ordre.
 *
 * La permutation est déterministe, semée : une question garde son ordre entre
 * deux affichages, et le rejeu du banc reste comparable.
 */

export type OptionsServies = { options: string[]; correctIndex: number };

/**
 * Ce qui peut rester à côté du nombre pour que l'option reste une quantité :
 * « 20 minutes » en est une, « Le scénario tient en 3 actes » non.
 */
const RESTE_MAXIMUM = 12;

const NOMBRE = /-?\d[\d\s]*(?:[.,]\d+)?/;

/** La valeur d'une option quand l'option est une quantité, sinon rien. */
function quantite(option: string): number | null {
  const trouve = NOMBRE.exec(option);

  if (!trouve) return null;

  const reste = option.replace(trouve[0], "").replace(/\s/g, "");

  if (reste.length > RESTE_MAXIMUM) return null;

  const valeur = Number(trouve[0].replace(/\s/g, "").replace(",", "."));

  return Number.isFinite(valeur) ? valeur : null;
}

/** Une option qui se souvient d'être la bonne, pour n'avoir plus à compter. */
type Option = { texte: string; estLaBonne: boolean };

/**
 * Les options triées, quand elles sont toutes des quantités distinctes. Un
 * lecteur attend des nombres dans l'ordre, et le tri ne doit rien non plus à la
 * position d'origine. Deux valeurs égales : on retombe sur le mélange.
 */
function triees(options: Option[]): Option[] | null {
  const mesurees = options.map((option) => ({ option, valeur: quantite(option.texte) ?? NaN }));

  if (mesurees.some((mesure) => Number.isNaN(mesure.valeur))) return null;
  if (new Set(mesurees.map((mesure) => mesure.valeur)).size !== mesurees.length) return null;

  return mesurees.sort((un, deux) => un.valeur - deux.valeur).map((mesure) => mesure.option);
}

/**
 * Tirage sans remise dans le paquet des options : chaque ordre est aussi
 * probable, et la suite est entièrement décidée par la graine.
 */
function melangees(options: Option[], graine: string): Option[] {
  const tirage = tirageDe(graine);
  const restantes = [...options];
  const ordre: Option[] = [];

  while (restantes.length > 0) {
    ordre.push(...restantes.splice(Math.floor(tirage() * restantes.length), 1));
  }

  return ordre;
}

export function ordonnerLesOptions(
  options: readonly string[],
  correctIndex: number,
  graine: string,
): OptionsServies {
  if (correctIndex < 0 || correctIndex >= options.length) {
    throw new RangeError(
      `La bonne réponse d'un QCM est hors des options (${correctIndex} sur ${options.length}).`,
    );
  }

  if (options.length < 2) return { options: [...options], correctIndex };

  const marquees = options.map((texte, rang) => ({ texte, estLaBonne: rang === correctIndex }));
  const servies = triees(marquees) ?? melangees(marquees, graine);

  return {
    options: servies.map((option) => option.texte),
    correctIndex: servies.findIndex((option) => option.estLaBonne),
  };
}
