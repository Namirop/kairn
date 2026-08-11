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
