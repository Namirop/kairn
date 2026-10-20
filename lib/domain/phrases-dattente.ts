import { CATALOGUES, type EtapeDeLAttente, type PhrasesDunPalier } from "./catalogue-dattente";
import type { LangueDuProduit } from "./langue-du-produit";

/**
 * Quand chaque phrase d'attente paraît, et laquelle ; les phrases sont dans
 * `catalogue-dattente.ts`. Le temps reçu est celui du regard, pas du travail :
 * qui recharge la page vient d'arriver.
 */

/** Sous trois secondes on lit en se dépêchant, au-delà de quatre l'écran paraît arrêté. */
export const RELEVE_MS = 3500;

type Palier = {
  depuisMs: number;
  phrases: PhrasesDunPalier;
};

/**
 * Mesuré en production : découpage de 2,5 à 15 s, écriture jusqu'à 40 s. 8 s,
 * la médiane du découpage plus une marge ; 20 s, plus personne ne croit à
 * « quelques secondes » ; 45 s, au-delà de tout ce qu'on a mesuré. Le dernier
 * palier tient jusqu'à l'abandon, à 90 s.
 *
 * Une borne est atteinte à la relève suivante, pas à la seconde près : une
 * phrase n'est pas remplacée une seconde après être apparue.
 */
const BORNES = [0, 8_000, 20_000, 45_000] as const;

/** Exporté pour les tests et la relecture. */
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
 * `tirage` (de 0 à 1, une fois par attente) décale l'entrée dans chaque palier
 * pour que deux dépôts ne lisent pas la même séquence. Le rang avance à chaque
 * relève quel que soit le palier : jamais deux fois la même phrase de suite.
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
