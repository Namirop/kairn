import type { Plan } from "./plans";

/** L'encre d'une pierre, diluée dans le papier à mesure qu'elle s'éloigne. */
export const encre = (part: number) =>
  `color-mix(in oklab, var(--stone-500) ${part.toFixed(1)}%, var(--ciel-teinte))`;

/**
 * Les trois nuances d'un cairn. Chacune passe par une variable dont le repli est
 * la dérivation : une palette peut poser ses propres pierres, sombres sur un
 * plan clair par exemple, ce qu'un mélange avec le ciel ne sait pas faire.
 */
export const teintesDe = (part: number, variable: string): [string, string, string] => [
  `var(${variable}-1, ${encre(part)})`,
  `var(${variable}-2, ${encre(part * 0.84)})`,
  `var(${variable}-3, ${encre(part * 0.7)})`,
];

/** La terre d'un plan, entre l'ombre et le papier. */
export const terre = (part: number) =>
  `color-mix(in oklab, var(--terre) ${part.toFixed(0)}%, var(--ciel-teinte))`;

/**
 * Une ligne de crête dans la vue commune. Les appuis diffèrent d'un plan à
 * l'autre : au même rythme, deux crêtes feraient des rayures, pas un relief.
 */
export function cheminDeCrete(y: number, appuis: number[]) {
  const pas = 1200 / (appuis.length - 1);
  const [premier, ...suite] = appuis.map((decalage, index) => ({
    x: index * pas,
    y: y + decalage,
  }));

  if (!premier) return { ligne: "", masse: "" };

  let precedent = premier;
  let ligne = `M0,${premier.y.toFixed(1)}`;

  for (const point of suite) {
    ligne +=
      ` C${(precedent.x + pas * 0.45).toFixed(1)},${precedent.y.toFixed(1)}` +
      ` ${(point.x - pas * 0.45).toFixed(1)},${point.y.toFixed(1)}` +
      ` ${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    precedent = point;
  }

  return { ligne, masse: `${ligne} L1200,1000 L0,1000 Z` };
}

export const crete = (plan: Plan) => cheminDeCrete(1000 * (1 - plan.crete), plan.appuis);
