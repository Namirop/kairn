/**
 * L'accord en nombre, en français.
 *
 * Zéro ne prend pas la marque du pluriel : « 0 concept », pas « 0 concepts ».
 * La règle traîne partout où un compteur s'affiche, et l'écrire à la main à
 * chaque endroit garantit qu'un endroit finira par l'oublier — c'est
 * précisément ce qui s'était passé sur la page d'un dépôt sans concept.
 */
export function accord(nombre: number, singulier: string, pluriel: string): string {
  return Math.abs(nombre) >= 2 ? pluriel : singulier;
}

/** Le nombre et son mot accordé, dans cet ordre. */
export function compte(nombre: number, singulier: string, pluriel: string): string {
  return `${nombre} ${accord(nombre, singulier, pluriel)}`;
}
