import { CATALOGUES, type EtapeDeLAttente, type PhrasesDunPalier } from "./catalogue-dattente";
import type { LangueDuProduit } from "./langue-du-produit";

/**
 * Quand chaque phrase d'attente paraît, et laquelle. Les phrases vivent dans
 * `catalogue-dattente.ts` ; ici, seulement le temps et l'index.
 *
 * Mesuré en production : le découpage va de 2,5 à 15 s, l'écriture des
 * questions jusqu'à une quarantaine. Le temps passé en paramètre est celui du
 * regard, pas du travail : il repart de zéro à chaque affichage, car qui
 * recharge la page vient d'arriver.
 */

/**
 * Combien de temps une phrase reste à l'écran : sous trois secondes on lit en se
 * dépêchant, au-delà de quatre l'écran paraît arrêté.
 */
export const RELEVE_MS = 3500;

/** Un palier de ton : à partir de quand il parle, et ce qu'il dit. */
type Palier = {
  depuisMs: number;
  phrases: PhrasesDunPalier;
};

/**
 * Les bornes des quatre paliers, communes aux trois étapes.
 *
 * 8 s : la médiane du découpage plus une marge. 20 s : plus personne ne croit à
 * « quelques secondes ». 45 s : au-delà de tout ce qu'on a mesuré. Le dernier
 * palier tient jusqu'à l'abandon, à 90 s, où un autre écran prend la main.
 *
 * Une borne est atteinte à la relève suivante, pas à la seconde près : c'est ce
 * qui évite qu'une phrase soit remplacée une seconde après être apparue.
 */
const BORNES = [0, 8_000, 20_000, 45_000] as const;

/** Les paliers d'une étape, bornes comprises. Sert aux tests et à la relecture. */
export function paliersDe(
  etape: EtapeDeLAttente,
  langue: LangueDuProduit,
): readonly [Palier, ...Palier[]] {
  const [un, deux, trois, quatre] = CATALOGUES[langue][etape];

  return [
    { depuisMs: BORNES[0], phrases: un },
    { depuisMs: BORNES[1], phrases: deux },
    { depuisMs: BORNES[2], phrases: trois },
    { depuisMs: BORNES[3], phrases: quatre },
  ];
}

/**
 * La phrase à afficher, pour une étape, un temps d'attente et un tirage donnés.
 *
 * `tirage` (entre 0 et 1, tiré une fois par attente, comme pour `inviteDeDepot`)
 * décale le point d'entrée dans chaque palier, pour que deux dépôts ne lisent
 * pas la même séquence. Le rang avance d'une phrase par relève, indépendamment
 * du palier : on ne relit jamais la même phrase deux relèves de suite.
 */
export function phraseDattente(
  etape: EtapeDeLAttente,
  ecouleMs: number,
  tirage: number,
  langue: LangueDuProduit,
): string {
  const depuis = Math.max(0, ecouleMs);
  const paliers = paliersDe(etape, langue);
  const rang = Math.floor(depuis / RELEVE_MS);

  let palier = paliers[0];

  for (const candidat of paliers) {
    if (depuis >= candidat.depuisMs) palier = candidat;
  }

  const borne = Math.min(Math.max(tirage, 0), 1 - Number.EPSILON);
  const decalage = Math.floor(borne * palier.phrases.length);

  // L'index est toujours positif et dans le tuple ; le repli ne sert qu'au typage.
  return palier.phrases[(rang + decalage) % palier.phrases.length] ?? palier.phrases[0];
}
