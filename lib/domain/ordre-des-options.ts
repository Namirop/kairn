import { tirageDe } from "./tirage-deterministe";

/**
 * L'ordre dans lequel les options d'un QCM sont montrées.
 *
 * Le modèle place la bonne réponse en première position 92 % du temps — mesuré
 * sur 52 QCM du banc, contre 25 % attendus d'un tirage uniforme. Quelqu'un qui
 * répond « la première » sans lire réussit donc un tiers des questions du
 * produit, et FSRS lit ces réussites comme des preuves de mémorisation : le
 * produit se ment à lui-même sur ce que la personne sait.
 *
 * **Ça ne se corrige pas dans le prompt.** Une position tirée au hasard est une
 * propriété de distribution, la classe de contrainte qu'un modèle ne tient pas ;
 * ce projet s'y est déjà brûlé trois fois — le plafond de douze concepts, la
 * langue du dépôt, et ceci. Une consigne « varie la position » donnerait un
 * mieux instable, invérifiable, et qui repartirait à la première reformulation.
 * Le serveur décide de l'ordre montré, le modèle produit le sien comme il veut.
 *
 * La permutation est déterministe, dérivée d'une graine, comme la géométrie du
 * cairn l'est de l'id de l'Atom. Deux raisons : une même question ne change pas
 * d'ordre entre deux affichages — elle paraîtrait différente à qui la retrouve —
 * et le rejeu du banc reste comparable d'un passage à l'autre.
 */

export type OptionsServies = { options: string[]; correctIndex: number };

/**
 * Ce qui peut rester à côté du nombre pour que l'option reste une quantité.
 *
 * « 1793 », « 20 minutes », « 5 % » en sont ; « Le scénario tient en 3 actes »
 * n'en est pas, et la trier par ce 3 donnerait un ordre incompréhensible.
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
 * Les quatre options triées, quand elles sont toutes des quantités distinctes.
 *
 * Un lecteur attend des nombres, des dates ou des durées dans l'ordre : les
 * mélanger ferait passer le désordre pour de l'étourderie. Le tri supprime le
 * biais de position aussi bien qu'une permutation, puisqu'il ne doit rien à la
 * position d'origine. Deux valeurs égales rendent l'ordre ambigu — on retombe
 * alors sur le mélange.
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

  // Une option seule n'a pas d'ordre à recevoir, et son cas n'a pas à traverser
  // le mélange pour en ressortir identique.
  if (options.length < 2) return { options: [...options], correctIndex };

  const marquees = options.map((texte, rang) => ({ texte, estLaBonne: rang === correctIndex }));
  const servies = triees(marquees) ?? melangees(marquees, graine);

  return {
    options: servies.map((option) => option.texte),
    correctIndex: servies.findIndex((option) => option.estLaBonne),
  };
}
