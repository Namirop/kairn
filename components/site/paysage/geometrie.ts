import type { Plan } from "./plans";

/** L'encre d'une pierre, diluée dans le papier à mesure qu'elle s'éloigne. */
export const encre = (part: number) =>
  `color-mix(in oklab, var(--stone-500) ${part.toFixed(1)}%, var(--ciel-teinte))`;

/**
 * Les trois nuances d'un cairn, dérivées de sa part d'encre.
 *
 * **Chacune passe par une variable dont la valeur de repli est le calcul
 * d'origine.** Sans palette, `var()` retombe donc sur exactement ce qui était
 * peint hier, au centième près ; avec, une palette peut poser ses propres
 * pierres. La dérivation ne suffisait plus : la brume rapproche un cairn de la
 * couleur du ciel, ce qui est juste pour le lointain et faux pour le plan
 * proche, qu'une palette peut vouloir sombre sur un sol clair. Un mélange ne
 * sait pas descendre plus bas que ce qu'on lui donne.
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
 * Une ligne de crête, tracée dans l'espace commun aux deux plans.
 *
 * Les sept appuis ne sont pas répartis pareil d'un plan à l'autre : deux crêtes
 * qui ondulent au même rythme font des rayures, pas un relief. C'est le
 * décalage des creux qui donne l'impression que l'une passe derrière l'autre.
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

/** La crête d'un plan, dans la vue commune. */
export const crete = (plan: Plan) => cheminDeCrete(1000 * (1 - plan.crete), plan.appuis);
