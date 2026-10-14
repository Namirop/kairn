/**
 * Les rares couleurs qui ne peuvent pas venir d'une variable CSS : le manifeste
 * PWA, la balise `theme-color` (lue avant toute feuille de style) et les
 * fichiers cuits par script. Seul endroit du code applicatif où une couleur est
 * en dur, avec `lib/email/templates/shell.ts`.
 *
 * Chacune doit rester égale à son jeton dans `app/styles/tokens/colors.css`.
 */

/** `--surface-papier`. */
export const PAPIER = "#eef5f7";

/** `--stone-900`, `--stone-800`, `--stone-700` — les pierres sur fond clair. */
export const PIERRES_SOMBRES = ["#0d2236", "#143049", "#1f4360"] as const;

/** `--stone-50`, `--stone-100`, `--stone-300` — les pierres sur fond sombre. */
export const PIERRES_CLAIRES = ["#f4f9fb", "#dcebf0", "#7fb3c8"] as const;

/**
 * `--lichen`. Le sommet du cairn ; il ne s'inverse jamais sur fond sombre.
 */
export const LICHEN = "#9fc22e";

/**
 * `--accent`. Le trait de l'image de partage : le lichen n'y tiendrait pas
 * (1,9:1 sur surface claire).
 */
export const ACCENT = "#1b4fc4";

/** `--surface-roche`. Le fond de la pastille d'application. */
export const ROCHE = "#1e2b3c";
