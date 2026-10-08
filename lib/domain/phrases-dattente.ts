import { CATALOGUES, type EtapeDeLAttente, type PhrasesDunPalier } from "./catalogue-dattente";
import type { LangueDuProduit } from "./langue-du-produit";

/**
 * Quand chaque phrase d'attente paraît, et laquelle.
 *
 * L'essai est le moment le plus fragile du produit : la seule page qui
 * convertit, et des délais qu'on ne maîtrise pas. Mesurés sur trois semaines de
 * production, le découpage va de 2,5 à 15 secondes, l'écriture des questions
 * jusqu'à une quarantaine. Un écran qui répète la même phrase pendant quarante
 * secondes a l'air figé ; un écran qui promet « quelques secondes » à la
 * trentième ment.
 *
 * Les phrases elles-mêmes sont dans `catalogue-dattente.ts` : ici il n'y a que
 * le temps et l'index.
 *
 * **Le temps mesuré est celui du regard, pas celui du travail.** Il repart de
 * zéro à chaque affichage de l'écran, et c'est voulu : quelqu'un qui recharge la
 * page sur une extraction déjà vieille d'une minute vient, lui, d'arriver.
 *
 * Aucune horloge ici : l'instant écoulé est un paramètre, comme partout dans
 * `lib/domain/`.
 */

/**
 * Combien de temps une phrase reste à l'écran.
 *
 * Assez pour être lue sans effort, assez peu pour que l'écran ne paraisse pas
 * arrêté. En dessous de trois secondes on lit en se dépêchant ; au-delà de
 * quatre, le silence entre deux phrases redevient une attente immobile.
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
 * Elles ne sont pas rondes par hasard. Huit secondes, c'est la médiane du
 * découpage plus une marge : en dessous, reconnaître que « c'est long » serait
 * faux. Vingt, c'est là où plus personne ne croit à « quelques secondes ».
 * Quarante-cinq, c'est au-delà de tout ce qu'on a mesuré en production — on n'a
 * plus rien à promettre, seulement à rassurer. Le dernier palier tient jusqu'à
 * l'abandon, à quatre-vingt-dix secondes, où un autre écran prend la main.
 *
 * **Une borne est atteinte à la relève suivante, pas à la seconde près.** Un
 * appelant qui interroge toutes les relèves passe de sept secondes à dix et
 * demie : le palier des huit secondes commence donc pour lui à dix et demie.
 * C'est le prix à payer pour qu'aucune phrase ne soit remplacée une seconde
 * après être apparue — un clignotement se voit, trois secondes de décalage non.
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
 * `tirage` est un nombre entre 0 et 1, tiré une fois par attente — même
 * convention que `inviteDeDepot`. Il décale le point d'entrée dans chaque
 * palier, pour que deux attentes de la même durée ne racontent pas la même
 * chose : sans lui, quiconque dépose deux fois lit deux fois la même séquence.
 *
 * Le rang avance d'une phrase par relève, indépendamment du palier. C'est ce qui
 * fait qu'on ne relit jamais la même phrase deux relèves de suite, y compris
 * juste après un changement de palier.
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

  // `rang` et `decalage` sont positifs, donc l'index l'est aussi et tombe
  // toujours dans le tuple. Le repli sur la première phrase est là pour le
  // typage, pas pour un cas réel.
  return palier.phrases[(rang + decalage) % palier.phrases.length] ?? palier.phrases[0];
}
