/**
 * Un cron arrêté (déclencheur coupé, secret périmé, passage mort) ne se voit
 * pas, le site reste vert : chaque passage abouti prévient Better Stack, et
 * c'est le silence qui alerte.
 */

const ADRESSES = {
  jobs: "BATTEMENT_JOBS_URL",
  rappels: "BATTEMENT_RAPPELS_URL",
} as const;

export type Passage = keyof typeof ADRESSES;

/** Un battement lent se perd plutôt que de rogner la minute du passage. */
const DELAI_MS = 5_000;

/**
 * Ne lève jamais : un battement injoignable est un défaut de surveillance, pas
 * de cron. Sans adresse (le cas en développement), ne fait rien.
 */
export async function signalerLeBattement(passage: Passage): Promise<void> {
  const adresse = process.env[ADRESSES[passage]];

  if (!adresse) return;

  try {
    const reponse = await fetch(adresse, {
      method: "GET",
      signal: AbortSignal.timeout(DELAI_MS),
    });

    if (!reponse.ok) {
      console.error(`Battement ${passage} refusé — statut ${reponse.status}.`);
    }
  } catch (erreur) {
    console.error(`Battement ${passage} injoignable.`, erreur);
  }
}
