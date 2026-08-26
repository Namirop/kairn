import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Fusion de classes Tailwind.
 *
 * Toute notre échelle porte des noms maison, et tailwind-merge ne connaît que
 * la sienne. Ce qu'il ne reconnaît pas, il le laisse passer — les deux classes
 * survivent, et c'est alors l'ordre de la feuille de style qui tranche, pas
 * l'ordre d'appel. Le symptôme n'est jamais une erreur : c'est une surcharge qui
 * ne prend pas.
 *
 * **Les tailles de police**, d'abord : sans elles, `text-corps` passe pour une
 * couleur de texte et supprime le `text-stone-50` qui le précède — un libellé de
 * bouton devient invisible sans qu'aucun outil ne le signale.
 *
 * **Les pas d'espacement**, ensuite, et c'est le même piège d'un cran plus bas.
 * `px-pas-4` posé sur un bouton dont la taille dit `px-pas-8` ne l'écrasait pas :
 * les deux étaient rendues, et `pas-8` gagnait parce qu'il vient plus tard dans
 * la feuille. On croyait resserrer un bouton, on ne resserrait rien, et le seul
 * moyen de s'en apercevoir était de mesurer. `spacing` étant la clef de thème
 * que tailwind-merge consulte pour tout ce qui espace, la déclarer une fois
 * couvre les rembourrages, les marges, les gouttières et les écarts.
 */
const TAILLES = [
  "mono",
  "petit",
  "corps",
  "h2-app",
  "h1-app",
  "enonce",
  "nombre",
  "h2-site",
  "h1-site",
  "ouverture",
];

const PAS = [
  "pas-1",
  "pas-2",
  "pas-3",
  "pas-4",
  "pas-6",
  "pas-8",
  "pas-12",
  "pas-16",
  "pas-24",
  "pas-campagne",
  "pas-dedans",
  "pas-scene",
];

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: PAS,
    },
    classGroups: {
      "font-size": [{ text: TAILLES }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
