/**
 * Le battement d'un passage de cron : le signal qu'il est allé au bout.
 *
 * Les trois routes cron sont la machinerie silencieuse du produit. Si le
 * déclencheur externe s'arrête, si le secret cesse de correspondre, ou si un
 * passage meurt en cours de route, rien ne le dit : le site reste debout, la
 * surveillance de disponibilité le voit vert, et pendant ce temps les dépôts ne
 * deviennent plus des concepts et les rappels ne partent plus. C'est une panne
 * qui ressemble à du calme.
 *
 * Un battement inverse la charge de la preuve. Ce n'est plus l'échec qui doit
 * se signaler, c'est le succès : chaque passage abouti prévient Better Stack,
 * et c'est le silence qui déclenche l'alerte.
 */

const ADRESSES = {
  jobs: "BATTEMENT_JOBS_URL",
  lots: "BATTEMENT_LOTS_URL",
  rappels: "BATTEMENT_RAPPELS_URL",
} as const;

export type Passage = keyof typeof ADRESSES;

/**
 * Cinq secondes : un battement est un signal, pas un travail. S'il n'aboutit
 * pas vite, il vaut mieux le perdre que rogner la minute accordée au passage.
 */
const DELAI_MS = 5_000;

/**
 * Signale qu'un passage a abouti.
 *
 * Ne lève jamais : un battement injoignable est un défaut de surveillance, pas
 * un défaut de cron, et il n'a pas à faire échouer un passage qui s'est bien
 * déroulé. Il est journalisé pour ne pas disparaître.
 *
 * Sans adresse configurée, la fonction ne fait rien et ne dit rien : c'est
 * l'état normal en développement, où aucun déclencheur n'appelle ces routes.
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
