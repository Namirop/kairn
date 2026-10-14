import { readFileSync } from "node:fs";

/**
 * Les jetons de couleur de la feuille, lus dans `app/styles/tokens/`.
 *
 * **Bornés au premier bloc `:root` de chaque fichier.** C'est la palette du produit, celle qui
 * s'applique quand rien d'autre n'est posé, c'est-à-dire toujours. Une lecture
 * du fichier entier garderait la dernière valeur rencontrée et mesurerait un
 * jeton surchargé plus bas dans une règle — un échec sur un produit intact,
 * ce qui est la pire sortie possible pour un filet.
 */

/**
 * Les couleurs écrites en clair.
 *
 * Seules les valeurs hexadécimales sont retenues : un jeton qui vaut un
 * dégradé ou un `color-mix` n'a pas de luminance à calculer, et le laisser
 * passer donnerait un ratio inventé.
 */
function hexDuBloc(corps: string): Record<string, string> {
  const trouves: Record<string, string> = {};

  for (const [, nom, valeur] of corps.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    if (nom && valeur) trouves[nom] = valeur;
  }

  return trouves;
}

/**
 * Les alias, résolus.
 *
 * Un jeton peut valoir un autre jeton. Sans cette passe, le script dirait
 * « jeton introuvable » là où la feuille, elle, sait très bien quelle couleur
 * elle sert. Une seule passe suffit tant qu'un alias ne pointe pas vers un
 * autre alias ; si ça arrivait, la valeur resterait absente et le script le
 * dirait, ce qui est le bon comportement pour un filet.
 */
function alias(corps: string, resolus: Record<string, string>): Record<string, string> {
  const trouves: Record<string, string> = {};

  for (const [, nom, cible] of corps.matchAll(/--([a-z0-9-]+):\s*var\(--([a-z0-9-]+)\)\s*;/gi)) {
    const valeur = nom && cible ? resolus[cible] : undefined;

    if (nom && valeur) trouves[nom] = valeur;
  }

  return trouves;
}

/**
 * Les fichiers qui posent la palette de base. `responsive.css` n'en fait pas
 * partie : il ne surcharge que des tailles, et sous condition de largeur.
 */
const FEUILLES_DE_JETONS = [
  "app/styles/tokens/colors.css",
  "app/styles/tokens/scale.css",
  "app/styles/tokens/landscape.css",
];

export function jetonsDeLaFeuille(chemins = FEUILLES_DE_JETONS): Record<string, string> {
  const corps = chemins
    .map((chemin) => /:root\s*\{([\s\S]*?)\n\}/.exec(readFileSync(chemin, "utf8"))?.[1] ?? "")
    .join("\n");
  const hex = hexDuBloc(corps);

  return { ...hex, ...alias(corps, hex) };
}
