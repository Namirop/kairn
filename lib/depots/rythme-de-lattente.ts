/**
 * Partagé par l'essai de la landing et le détail d'un dépôt. Chaque seconde
 * d'abord (l'appel est léger) ; à 15 s l'écran avoue et ralentit, un long texte
 * pouvant prendre 20 s ; à 90 s il s'arrête : job reporté ou perdu, le cron le reprend.
 */

export const RYTHME_VIF_MS = 1000;
export const RYTHME_LENT_MS = 5000;
export const AVEU_MS = 15_000;
export const ABANDON_MS = 90_000;

export function pauseApres(ecouleMs: number): number {
  return ecouleMs < AVEU_MS ? RYTHME_VIF_MS : RYTHME_LENT_MS;
}

/**
 * `LONGUE` interroge encore, le résultat viendra seul ; `ABANDONNEE` ne
 * l'attend plus et demande un geste. Ne pas les confondre.
 */
export type EtatDeLAttente = "NORMALE" | "LONGUE" | "ABANDONNEE";

export function etatDeLAttente(ecouleMs: number): EtatDeLAttente {
  if (ecouleMs >= ABANDON_MS) return "ABANDONNEE";
  if (ecouleMs >= AVEU_MS) return "LONGUE";

  return "NORMALE";
}
