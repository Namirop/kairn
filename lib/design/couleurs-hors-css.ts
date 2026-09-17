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
export const PIERRES_SOMBRES = ["#141920", "#282e34", "#3b4248"] as const;

/** `--stone-50`, `--stone-100`, `--stone-300` — les pierres sur fond sombre. */
export const PIERRES_CLAIRES = ["#f2f2ef", "#e4e4df", "#bdc0c2"] as const;

/**
 * `--glacier` et `--glacier-profond`. Le sommet du cairn, et le seul point de
 * couleur de l'identité.
 *
 * Deux valeurs et non une, parce que le sommet s'inverse avec les pierres : le
 * vif porte 6,94 sur la roche et 1,76 sur le papier, le profond 5,49 sur le
 * papier. Aucune teinte unique ne passe les trois pour un d'un objet graphique
 * sur les deux fonds. Une icône cuite sur le mauvais des deux est une marque
 * qu'on ne voit pas, et personne ne la recuit avant qu'un utilisateur le dise.
 */
export const GLACIER = "#3fc9de";
export const GLACIER_PROFOND = "#0e6b7c";

/** `--surface-roche`. Le fond de la pastille d'application. */
export const ROCHE = "#282e34";
