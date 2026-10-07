import { readFileSync } from "node:fs";

/**
 * Les jetons de couleur de `globals.css`, par jeu.
 *
 * La feuille en porte plusieurs : le bloc `:root`, qui est ce que la production
 * sert, et un bloc par palette à l'essai. Les mesurer tous demande de les lire
 * séparément — une lecture du fichier entier garderait la dernière valeur
 * rencontrée et mesurerait une maquette en croyant mesurer le produit.
 *
 * Une palette ne redéfinit que ce qu'elle change : ses jetons se posent donc
 * par-dessus ceux de la production, exactement comme la cascade le fait.
 */

/** Un jeu de jetons nommé : la production, ou une palette à l'essai. */
export type JeuDeJetons = {
  nom: string;
  /** `true` pour la production. Une palette qui échoue ne dit pas la même chose. */
  servi: boolean;
  jetons: Record<string, string>;
};

/**
 * Les couleurs écrites en clair dans un bloc.
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
 * Un jeton peut valoir un autre jeton — c'est ainsi que l'accent du produit
 * vaut le lichen en production et une couleur à lui sous une palette. Sans
 * cette passe, le script dirait « jeton introuvable » là où la feuille, elle,
 * sait très bien quelle couleur elle sert.
 *
 * Une seule passe suffit tant qu'un alias ne pointe pas vers un autre alias ;
 * si ça arrivait, la valeur resterait absente et le script le dirait, ce qui
 * est le bon comportement pour un filet.
 */
function alias(corps: string, resolus: Record<string, string>): Record<string, string> {
  const trouves: Record<string, string> = {};

  for (const [, nom, cible] of corps.matchAll(/--([a-z0-9-]+):\s*var\(--([a-z0-9-]+)\)\s*;/gi)) {
    const valeur = nom && cible ? resolus[cible] : undefined;

    if (nom && valeur) trouves[nom] = valeur;
  }

  return trouves;
}

export function jeuxDeJetons(chemin = "app/globals.css"): JeuDeJetons[] {
  const css = readFileSync(chemin, "utf8");
  const corpsParDefaut = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
  const hexParDefaut = hexDuBloc(corpsParDefaut);
  const production = { ...hexParDefaut, ...alias(corpsParDefaut, hexParDefaut) };

  const palettes = [...css.matchAll(/:root\[data-palette="([a-z-]+)"\]\s*\{([\s\S]*?)\n\}/g)].map(
    (bloc) => {
      const corps = bloc[2] ?? "";
      const hex = { ...production, ...hexDuBloc(corps) };

      return {
        nom: `palette ${bloc[1]}`,
        servi: false,
        jetons: { ...hex, ...alias(corps, hex) },
      };
    },
  );

  return [{ nom: "production", servi: true, jetons: production }, ...palettes];
}
