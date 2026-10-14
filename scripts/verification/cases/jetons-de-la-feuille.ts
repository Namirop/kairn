import { readFileSync } from "node:fs";

/**
 * Les jetons de couleur de la feuille, lus dans `app/styles/tokens/`.
 *
 * Bornés au premier bloc `:root` de chaque fichier, la palette de base : lire
 * le fichier entier garderait la dernière valeur rencontrée, celle d'une
 * surcharge plus bas, et ferait échouer le filet sur un produit intact.
 */

/**
 * Les couleurs écrites en hexadécimal, seules : un dégradé ou un `color-mix`
 * n'a pas de luminance calculable, et donnerait un ratio inventé.
 */
function hexDuBloc(corps: string): Record<string, string> {
  const trouves: Record<string, string> = {};

  for (const [, nom, valeur] of corps.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    if (nom && valeur) trouves[nom] = valeur;
  }

  return trouves;
}

/**
 * Les alias (`--a: var(--b)`), résolus en une passe. Un alias d'alias reste
 * absent et le script le signale : c'est le bon comportement pour un filet.
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
