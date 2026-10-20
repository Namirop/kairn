/**
 * Les surfaces et ce qu'elles emportent. C'est le changement de fond qui sépare
 * deux sujets, jamais un filet. `session` n'est le sol que de la session.
 * Chaque surface porte ses encres : un panneau sombre aux gris du papier serait
 * illisible.
 */

export type Surface = "papier" | "ombre" | "givre" | "roche" | "session";

type Habillage = {
  fond: string;
  encre: string;
  second: string;
  /** Le grain se pose en multiply sur les clairs, en overlay sur la roche. */
  grain: string;
  /** Le fond d'un objet qui doit se détacher de cette surface. */
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
  givre: {
    fond: "bg-surface-givre",
    encre: "text-stone-900",
    second: "text-stone-500",
    grain: "grain",
    objet: "bg-surface-papier",
    sombre: false,
  },
  // Un cran plus foncé : le gris du papier passe ici sous le seuil de contraste.
  session: {
    fond: "bg-surface-session",
    encre: "text-stone-900",
    second: "text-stone-700",
    grain: "grain",
    objet: "bg-surface-papier",
    sombre: false,
  },
  roche: {
    fond: "bg-surface-roche",
    encre: "text-stone-50",
    second: "text-stone-300",
    grain: "grain grain-clair",
    // Plus clair : sur du sombre, un objet posé capte la lumière, il ne creuse pas.
    objet: "bg-stone-700",
    sombre: true,
  },
};

/** Pour ce qui se calcule hors classe Tailwind. */
export function variableDe(surface: Surface): string {
  return `var(--surface-${surface})`;
}
