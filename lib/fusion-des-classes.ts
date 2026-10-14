import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Fusion de classes Tailwind.
 *
 * Notre échelle porte des noms maison que tailwind-merge ne connaît pas : sans
 * les déclarer, il laisse passer les deux classes en conflit et c'est l'ordre
 * de la feuille qui tranche — une surcharge qui ne prend pas, sans erreur.
 *
 * Tailles de police : sans elles, `text-corps` passe pour une couleur et
 * supprime le `text-stone-50` qui le précède.
 *
 * Pas d'espacement : sans eux, `px-pas-4` n'écrase pas un `px-pas-8` posé avant.
 * `spacing` est la clef de thème consultée pour tout ce qui espace (rembourrages,
 * marges, gouttières, écarts).
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
