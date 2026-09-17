import {
  GLACIER,
  GLACIER_PROFOND,
  PIERRES_CLAIRES,
  PIERRES_SOMBRES,
  ROCHE,
} from "@/lib/design/couleurs-hors-css";
import { cadreDuSymbole, empilementDuLogo, nuanceDuRang } from "@/lib/design/marque";

/**
 * Le symbole en SVG littéral, pour ce qui sort de l'application.
 *
 * Les icônes cuites, le fichier de partage et l'image Open Graph ne traversent
 * aucune feuille de style : il leur faut des couleurs écrites. Ce module rend donc
 * le même empilement que le composant, avec des valeurs plutôt que des classes.
 *
 * **Ce n'est pas un second dessin.** La géométrie vient d'`empilementDuLogo()`, la
 * dégradation de `nuanceDuRang()`, les couleurs de `couleurs-hors-css`. Rien n'est
 * recopié : le jour où la forme des pierres bouge, ces fichiers bougent à la
 * prochaine exécution du script.
 */

/** Les chemins des pierres, dans le repère de l'empilement. */
function corps(pierres: number, clair: boolean): string {
  const empilement = empilementDuLogo(pierres);
  const teintes = clair ? PIERRES_CLAIRES : PIERRES_SOMBRES;
  const dernier = empilement.pierres.length - 1;

  return empilement.pierres
    .map((pierre, rang) => {
      const sommet = clair ? GLACIER : GLACIER_PROFOND;
      const teinte =
        rang === dernier ? sommet : teintes[nuanceDuRang(rang, empilement.pierres.length)];

      return `<g transform="translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})"><path d="${pierre.chemin}" fill="${teinte}"/></g>`;
    })
    .join("");
}

/** Le cadrage serré, le même que celui du composant. */
const cadre = cadreDuSymbole;

/** Le symbole seul, sur fond transparent, à sa proportion naturelle. */
export function symboleSeul({
  pierres,
  clair = false,
  hauteurPx,
}: {
  pierres: number;
  clair?: boolean;
  hauteurPx: number;
}): string {
  const vue = cadre(pierres);
  const largeurPx = Math.round((hauteurPx * vue.largeur) / vue.hauteur);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largeurPx}" height="${hauteurPx}" viewBox="${vue.x} ${vue.y} ${vue.largeur} ${vue.hauteur}">${corps(pierres, clair)}</svg>`;
}

/**
 * Le symbole posé sur un carré sombre.
 *
 * `part` est la fraction du côté que le symbole occupe en hauteur. Une icône
 * d'application respire : à un contre un, elle touche les bords et se fait rogner
 * par le masque de la plateforme.
 *
 * `rayon` est en fraction du côté, nul pour une icône que la plateforme masque
 * elle-même — arrondir deux fois laisse quatre coins vides.
 */
export function symboleSurPastille({
  pierres,
  cote,
  part,
  rayon,
}: {
  pierres: number;
  cote: number;
  part: number;
  rayon: number;
}): string {
  const vue = cadre(pierres);
  const hauteur = cote * part;
  const largeur = (hauteur * vue.largeur) / vue.hauteur;
  const echelle = hauteur / vue.hauteur;
  const x = (cote - largeur) / 2;
  const y = (cote - hauteur) / 2;
  const r = Math.round(cote * rayon);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cote}" height="${cote}" viewBox="0 0 ${cote} ${cote}">`,
    `<rect width="${cote}" height="${cote}" rx="${r}" ry="${r}" fill="${ROCHE}"/>`,
    `<g transform="translate(${x} ${y}) scale(${echelle}) translate(${-vue.x} ${-vue.y})">`,
    corps(pierres, true),
    "</g></svg>",
  ].join("");
}
