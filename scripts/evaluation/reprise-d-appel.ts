import { AppelModeleError } from "@/lib/ai/errors";

/**
 * Une seule reprise par appel, exception assumée au « pas de retry » du produit
 * (voir `callAI`) : une panne isolée qui laisse un dépôt vide dans le figé coûte
 * plus cher qu'un second essai. Jamais sur ces codes-ci, qui échoueraient à
 * l'identique. Les reprises remontent au rapport pour ne pas passer inaperçues.
 */
const REPRISES_INAPPROPRIEES = new Set([
  "AI_QUOTA",
  "AI_USER_QUOTA",
  "AI_ANONYMOUS_QUOTA",
  "AI_DISABLED",
  "AI_SCHEMA",
  "AI_CONFIG",
  "AI_FIXTURE_MISSING",
]);

export async function avecUneReprise<T>(
  action: () => Promise<T>,
): Promise<{ resultat: T; reprises: number }> {
  try {
    return { resultat: await action(), reprises: 0 };
  } catch (erreur) {
    if (erreur instanceof AppelModeleError && REPRISES_INAPPROPRIEES.has(erreur.code)) {
      throw erreur;
    }

    return { resultat: await action(), reprises: 1 };
  }
}
