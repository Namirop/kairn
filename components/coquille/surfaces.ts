/**
 * Les surfaces, et ce qu'elles emportent.
 *
 * Une page est une pile de panneaux, et chaque panneau porte l'une d'elles :
 * c'est le changement de fond qui sépare deux sujets, jamais un filet.
 *
 * `session` est le sol d'un seul écran, celui de la session, où la carte de la
 * question est posée comme un objet. Aucun autre écran ne la prend.
 *
 * Le tableau dit aussi l'encre et le texte second de chaque surface : un
 * panneau sombre qui hériterait des gris du papier serait illisible.
 */

export type Surface = "papier" | "ombre" | "givre" | "roche" | "session";

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
  givre: {
    fond: "bg-surface-givre",
    encre: "text-stone-900",
    second: "text-stone-500",
    grain: "grain",
    objet: "bg-surface-papier",
    sombre: false,
  },
  /*
    Le texte second fonce d'un cran : sur cet aplat teinté, le gris réglé pour
    le papier passe sous le seuil de contraste.
  */
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
    /*
      Plus clair que la roche et non plus sombre : sur une surface sombre, un
      objet posé capte la lumière, il ne creuse pas.
    */
    objet: "bg-stone-700",
    sombre: true,
  },
};

/** La variable CSS d'une surface, pour ce qui se calcule hors classe Tailwind. */
export function variableDe(surface: Surface): string {
  return `var(--surface-${surface})`;
}
