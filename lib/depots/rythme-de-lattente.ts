/**
 * Le rythme auquel un écran redemande où en est une extraction, partagé par
 * l'essai de la landing et le détail d'un dépôt.
 *
 * - Toutes les secondes d'abord : l'appel est léger.
 * - À 15 s, l'écran dit que c'est long et ralentit, sans s'arrêter : un long
 *   texte peut prendre 20 s sans que rien n'aille mal.
 * - À 90 s, il s'arrête : c'est un job reporté ou perdu, le cron le reprendra.
 */

export const RYTHME_VIF_MS = 1000;
export const RYTHME_LENT_MS = 5000;
export const AVEU_MS = 15_000;
export const ABANDON_MS = 90_000;

/** La pause avant le prochain tour, selon le temps déjà passé à attendre. */
export function pauseApres(ecouleMs: number): number {
  return ecouleMs < AVEU_MS ? RYTHME_VIF_MS : RYTHME_LENT_MS;
}

/**
 * Ce que l'écran peut dire de son attente.
 *
 * - `NORMALE` : l'attente ordinaire.
 * - `LONGUE` : plus long que d'habitude, mais l'écran interroge encore et le
 *   résultat s'affichera de lui-même. Ne pas la confondre avec l'abandon.
 * - `ABANDONNEE` : l'interrogation s'est arrêtée ; il faut un geste pour
 *   reprendre.
 */
export type EtatDeLAttente = "NORMALE" | "LONGUE" | "ABANDONNEE";

export function etatDeLAttente(ecouleMs: number): EtatDeLAttente {
  if (ecouleMs >= ABANDON_MS) return "ABANDONNEE";
  if (ecouleMs >= AVEU_MS) return "LONGUE";

  return "NORMALE";
}
