import { tirageDe } from "./tirage-deterministe";

/**
 * Géométrie de l'empilement de pierres.
 *
 * Chaque pierre tire ses dimensions, sa rotation, son décalage et ses coins d'un
 * générateur semé par l'id de son Atom : même graine, même cairn, pour toujours.
 * Coordonnées en unités de viewBox, largeur 100.
 */

export const LARGEUR_VUE = 100;
const LARGEUR_BASE = 60;
/** Un vrai cairn s'affine en montant. */
const AFFINEMENT = 0.45;
/**
 * De combien chaque pierre mord celle du dessous. Les arêtes penchées et la
 * rotation écartent le contact apparent : trop peu, un liseré de fond passe et
 * les pierres lévitent ; trop, la pile devient un bloc. Le remplissage opaque
 * cache le chevauchement.
 */
const CHEVAUCHEMENT = 0.9;
const MARGE_HAUTE = 6;
const HAUTEUR_SOL = 4;

export type Pierre = {
  cle: string;
  /** Chemin SVG centré sur l'origine, à placer par `transform`. */
  chemin: string;
  x: number;
  y: number;
  rotation: number;
  /** Encombrement de la pierre, pour la détection de contact et la chute. */
  largeur: number;
  hauteur: number;
  /** 0 la plus sombre, 2 la plus claire. */
  nuance: 0 | 1 | 2;
};

export type Empilement = {
  pierres: Pierre[];
  hauteur: number;
  ySol: number;
};

function arrondi(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

/**
 * Quadrilatère taillé : flancs pincés vers le haut, arêtes penchées, coins mordus
 * inégalement puis adoucis. C'est la somme des trois qui évite le rectangle
 * arrondi.
 *
 * Exporté pour la marque, dont la pierre du point du i a ses propres
 * proportions.
 */
export function tailler(largeur: number, hauteur: number, tirage: () => number): string {
  const bas = largeur / 2;
  const haut = (largeur * (1 - tirage() * 0.16)) / 2;
  const demiH = hauteur / 2;
  const pente = (amplitude: number) => arrondi((tirage() * 2 - 1) * hauteur * amplitude);
  const penteHaut = pente(0.07);
  const penteBas = pente(0.05);
  const mordu = () => arrondi(Math.min(hauteur, largeur * 0.5) * (0.18 + tirage() * 0.3));
  const [a, b, c, d] = [mordu(), mordu(), mordu(), mordu()];
  const p = (x: number, y: number) => `${arrondi(x)} ${arrondi(y)}`;

  const hautGauche = -demiH - penteHaut;
  const hautDroit = -demiH + penteHaut;
  const basGauche = demiH - penteBas;
  const basDroit = demiH + penteBas;

  return [
    `M ${p(-haut + a, hautGauche)}`,
    `L ${p(haut - d, hautDroit)}`,
    `Q ${p(haut, hautDroit)} ${p(haut, hautDroit + d)}`,
    `L ${p(bas, basDroit - c)}`,
    `Q ${p(bas, basDroit)} ${p(bas - c, basDroit)}`,
    `L ${p(-bas + b, basGauche)}`,
    `Q ${p(-bas, basGauche)} ${p(-bas, basGauche - b)}`,
    `L ${p(-haut, hautGauche + a)}`,
    `Q ${p(-haut, hautGauche)} ${p(-haut + a, hautGauche)}`,
    "Z",
  ].join(" ");
}

/** Graine d'une pierre : l'id de l'Atom quand on l'a, sinon son rang. */
function graineDe(index: number, graines?: string[]): string {
  return graines?.[index] ?? `cairn-pierre-${index}`;
}

export function empiler(nombre: number, graines?: string[]): Empilement {
  const total = Math.max(0, Math.floor(nombre));
  const pierres: Pierre[] = [];
  let hauteurCumulee = 0;

  for (let index = 0; index < total; index += 1) {
    const cle = graineDe(index, graines);
    const tirage = tirageDe(cle);
    const progression = total === 1 ? 0 : index / (total - 1);
    const largeur = LARGEUR_BASE * (1 - progression * AFFINEMENT) * (0.86 + tirage() * 0.24);
    const hauteur = 10 + tirage() * 9;
    // L'assise devient plus hasardeuse en montant : décalage et inclinaison
    // suivent la hauteur.
    const instabilite = 0.35 + progression * 0.65;

    const chemin = tailler(largeur, hauteur, tirage);
    const teinte = tirage();
    const nuance: 0 | 1 | 2 = teinte < 0.34 ? 0 : teinte < 0.67 ? 1 : 2;

    hauteurCumulee += hauteur;
    pierres.push({
      cle,
      chemin,
      x: arrondi(LARGEUR_VUE / 2 + (tirage() * 2 - 1) * largeur * 0.1 * instabilite),
      y: arrondi(-(hauteurCumulee - hauteur / 2) + CHEVAUCHEMENT * index),
      rotation: arrondi((tirage() * 2 - 1) * 3.5 * instabilite),
      largeur: arrondi(largeur),
      hauteur: arrondi(hauteur),
      nuance,
    });
  }

  const hauteurPile = hauteurCumulee - CHEVAUCHEMENT * Math.max(total - 1, 0);

  return {
    pierres,
    hauteur: arrondi(hauteurPile + MARGE_HAUTE + HAUTEUR_SOL),
    ySol: HAUTEUR_SOL,
  };
}
