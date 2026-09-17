/**
 * Les quatre surfaces, et ce qu'elles emportent.
 *
 * Une page est une pile de panneaux, et chaque panneau porte l'une d'elles :
 * c'est le changement de fond qui sépare deux sujets, plus jamais un filet.
 *
 * Le tableau dit aussi la couleur de l'encre et celle du texte second, pour que
 * personne n'ait à se demander comment écrire sur la roche. Un panneau sombre
 * qui hériterait des gris du papier serait illisible, et c'est le genre d'oubli
 * qu'on ne voit qu'en production.
 */

export type Surface = "papier" | "ombre" | "glacier" | "roche";

type Habillage = {
  fond: string;
  encre: string;
  second: string;
  /** Le grain se pose en multiply sur les clairs, en overlay sur la roche. */
  grain: string;
  /** Ce qu'on pose sur cette surface pour qu'un objet s'en détache. */
  objet: string;
  sombre: boolean;
};

export const SURFACES: Record<Surface, Habillage> = {
  papier: {
    fond: "bg-surface-papier",
    encre: "text-stone-900",
    second: "text-stone-500",
    grain: "grain",
    objet: "bg-surface-ombre",
    sombre: false,
  },
  ombre: {
    fond: "bg-surface-ombre",
    encre: "text-stone-900",
    second: "text-stone-500",
    grain: "grain",
    objet: "bg-surface-papier",
    sombre: false,
  },
  glacier: {
    fond: "bg-surface-glacier",
    encre: "text-stone-900",
    second: "text-stone-500",
    grain: "grain",
    objet: "bg-surface-papier",
    sombre: false,
  },
  roche: {
    fond: "bg-surface-roche",
    encre: "text-stone-50",
    second: "text-stone-300",
    grain: "grain grain-clair",
    objet: "bg-stone-800",
    sombre: true,
  },
};

/** La variable CSS d'une surface, pour ce qui se calcule hors classe Tailwind. */
export function variableDe(surface: Surface): string {
  return `var(--surface-${surface})`;
}
