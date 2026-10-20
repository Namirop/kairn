/**
 * Pour le manifeste, `theme-color` (lue avant toute feuille de style) et les
 * fichiers cuits par script. Seules couleurs en dur avec celles des emails ;
 * chacune doit rester égale à son jeton dans `app/styles/tokens/couleurs.css`.
 */

/** `--surface-papier`. */
export const PAPIER = "#eef5f7";

/** `--stone-900`, `--stone-800`, `--stone-700`. */
export const PIERRES_SOMBRES = ["#0d2236", "#143049", "#1f4360"] as const;

/** `--stone-50`, `--stone-100`, `--stone-300`. */
export const PIERRES_CLAIRES = ["#f4f9fb", "#dcebf0", "#7fb3c8"] as const;

/** `--lichen`. Ne s'inverse jamais sur fond sombre. */
export const LICHEN = "#9fc22e";

/** `--accent`. Pour l'image de partage : le lichen ferait 1,9:1 sur le clair. */
export const ACCENT = "#1b4fc4";

/** `--surface-roche`. */
export const ROCHE = "#1e2b3c";
