import { tirageDe } from "./tirage-deterministe";

/**
 * L'ordre des options d'un QCM, décidé par le serveur : le modèle place la
 * bonne réponse en premier 92 % du temps (52 QCM mesurés), et FSRS lirait ce
 * réflexe de position comme un souvenir. La permutation est semée, pour qu'une
 * question garde son ordre et que le rejeu du banc reste comparable.
 */

export type OptionsServies = { options: string[]; correctIndex: number };

/** « 20 minutes » est une quantité, « Le scénario tient en 3 actes » non. */
const RESTE_MAXIMUM = 12;

const NOMBRE = /-?\d[\d\s]*(?:[.,]\d+)?/;

function quantite(option: string): number | null {
  const trouve = NOMBRE.exec(option);

  if (!trouve) return null;

  const reste = option.replace(trouve[0], "").replace(/\s/g, "");

  if (reste.length > RESTE_MAXIMUM) return null;

  const valeur = Number(trouve[0].replace(/\s/g, "").replace(",", "."));

  return Number.isFinite(valeur) ? valeur : null;
}

type Option = { texte: string; estLaBonne: boolean };

/**
 * Quand toutes sont des quantités distinctes : un lecteur attend des nombres
 * dans l'ordre, et le tri ne doit rien à la position d'origine.
 */
function triees(options: Option[]): Option[] | null {
  const mesurees = options.map((option) => ({ option, valeur: quantite(option.texte) ?? NaN }));

  if (mesurees.some((mesure) => Number.isNaN(mesure.valeur))) return null;
  if (new Set(mesurees.map((mesure) => mesure.valeur)).size !== mesurees.length) return null;

  return mesurees.sort((un, deux) => un.valeur - deux.valeur).map((mesure) => mesure.option);
}

/** Tirage sans remise : chaque ordre est équiprobable et décidé par la graine. */
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
