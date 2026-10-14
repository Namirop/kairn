/**
 * Le battement d'un passage de cron : le signal qu'il est allé au bout.
 *
 * Un cron arrêté (déclencheur coupé, secret qui ne correspond plus, passage
 * mort en route) ne se voit pas : le site reste vert. Chaque passage abouti
 * prévient donc Better Stack, et c'est le silence qui déclenche l'alerte.
 */

const ADRESSES = {
  jobs: "BATTEMENT_JOBS_URL",
  rappels: "BATTEMENT_RAPPELS_URL",
} as const;

export type Passage = keyof typeof ADRESSES;

/**
 * Un battement lent se perd plutôt que de rogner la minute accordée au passage.
 */
const DELAI_MS = 5_000;

/**
 * Signale qu'un passage a abouti.
 *
 * Ne lève jamais : un battement injoignable est un défaut de surveillance, pas
 * de cron ; il est journalisé.
 *
 * Sans adresse configurée, elle ne fait rien : c'est l'état normal en
 * développement.
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
