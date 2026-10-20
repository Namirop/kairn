import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge ignore nos noms maison : non déclarés, deux classes en conflit
 * passent et l'ordre de la feuille tranche, sans erreur. Sans les tailles,
 * `text-corps` passe pour une couleur et efface `text-stone-50` ; sans les pas,
 * `px-pas-4` n'écrase pas `px-pas-8`. `spacing` couvre tout ce qui espace.
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

const fusionnerTailwind = extendTailwindMerge({
  extend: {
    theme: {
      spacing: PAS,
    },
    classGroups: {
      "font-size": [{ text: TAILLES }],
    },
  },
});

export function cn(...classes: ClassValue[]) {
  return fusionnerTailwind(clsx(classes));
}
