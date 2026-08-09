import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Fusion de classes Tailwind.
 *
 * Nos tailles de police portent des noms maison (`text-corps`, `text-petit`…).
 * Sans cette extension, tailwind-merge les prend pour des couleurs de texte et
 * supprime silencieusement le `text-stone-50` qui les précède — un libellé de
 * bouton devient alors invisible sans qu'aucun outil ne le signale.
 */
const TAILLES = ["mono", "petit", "corps", "h2-app", "h1-app", "nombre", "h2-site", "h1-site"];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: TAILLES }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
