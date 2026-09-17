/**
 * Les rares couleurs qui ne peuvent pas venir d'une variable CSS.
 *
 * Le manifeste PWA est du JSON et la balise `theme-color` est lue par le
 * navigateur avant toute feuille de style : ni l'un ni l'autre ne sait résoudre
 * `var(--surface-papier)`. Elles sont donc écrites une fois ici, et ce fichier
 * est le seul endroit du code applicatif où une couleur apparaît en dur.
 *
 * L'autre exception, documentée sur place, est `lib/email/templates/shell.ts` :
 * les clients de messagerie ne lisent pas les variables CSS non plus.
 */

/** Doit rester égal à `--surface-papier` dans app/globals.css. */
export const PAPIER = "#f2f2ef";

/**
 * Les couleurs du symbole, pour les fichiers cuits.
 *
 * Un `.png` ne lit pas plus une variable CSS qu'un manifeste : les icônes et
 * l'image de partage sont produites par un script, hors de toute feuille de
 * style. Elles sont donc ici, avec les autres, et le composant de marque continue
 * de passer par les classes — deux traductions d'une même géométrie, jamais deux
 * géométries.
 *
 * Chacune doit rester égale à son jeton dans `app/globals.css`.
 */

/** `--stone-900`, `--stone-800`, `--stone-700` — les pierres sur fond clair. */
export const PIERRES_SOMBRES = ["#16191a", "#2a2e2c", "#3d4240"] as const;

/** `--stone-50`, `--stone-100`, `--stone-300` — les pierres sur fond sombre. */
export const PIERRES_CLAIRES = ["#f2f2ef", "#e4e4df", "#bfc0ba"] as const;

/**
 * `--lichen`. Le sommet du cairn, et le seul point de couleur de l'identité.
 * Il ne s'inverse jamais : les pierres changent de gris, lui reste lui-même.
 */
export const LICHEN = "#7a8b4f";

/** `--surface-roche`. Le fond de la pastille d'application. */
export const ROCHE = "#2a2e2c";
