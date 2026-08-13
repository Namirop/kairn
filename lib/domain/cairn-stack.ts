/**
 * Géométrie de l'empilement de pierres.
 *
 * Fonction pure : même graine, même cairn, pour toujours. Chaque pierre tire sa
 * largeur, sa hauteur, sa rotation, son décalage et le mordu de ses quatre
 * coins d'un générateur semé par l'identifiant de l'Atom qu'elle représente.
 * Deux utilisateurs n'ont donc jamais le même empilement, et le sien ne bouge
 * pas entre deux visites.
 *
 * Les coordonnées sont en unités de viewBox, largeur 100.
 */

export const LARGEUR_VUE = 100;
const LARGEUR_BASE = 60;
/** Un vrai cairn s'affine en montant. */
const AFFINEMENT = 0.45;
/**
 * De combien chaque pierre mord celle du dessous.
 *
 * C'était un **jeu** — un espace positif entre deux pierres — et ça se voyait :
 * un liseré de fond passait entre chacune, et l'empilement avait l'air de
 * léviter au lieu de reposer. Deux pierres qui se touchent vraiment n'ont pas de
 * jour entre elles ; celles-ci ont en plus des arêtes penchées et une rotation,
 * dont les coins écartent encore le contact apparent. Elles se chevauchent donc,
 * de quoi absorber la pente d'une face et l'inclinaison des deux.
 *
 * Le remplissage est opaque : ce que le chevauchement enfouit ne se voit pas,
 * seule la pile raccourcit un peu.
 */
const CHEVAUCHEMENT = 2.2;
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

function empreinte(graine: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < graine.length; index += 1) {
    hash ^= graine.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Générateur mulberry32 : court, rapide, suffisamment bien réparti. */
function generateur(etat: number): () => number {
  let courant = etat;
  return () => {
    courant = (courant + 0x6d2b79f5) >>> 0;
    let melange = Math.imul(courant ^ (courant >>> 15), 1 | courant);
    melange = (melange + Math.imul(melange ^ (melange >>> 7), 61 | melange)) ^ melange;
    return ((melange ^ (melange >>> 14)) >>> 0) / 4294967296;
  };
}

function arrondi(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

/**
 * Quadrilatère taillé.
 *
 * Trois irrégularités se cumulent, et c'est leur somme qui donne une pierre
 * plutôt qu'un rectangle arrondi : les flancs se pincent vers le haut, les deux
 * arêtes penchent d'un côté ou de l'autre, et les quatre coins sont mordus de
 * façon inégale avant d'être adoucis.
 */
function tailler(largeur: number, hauteur: number, tirage: () => number): string {
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
    const tirage = generateur(empreinte(cle));
    const progression = total === 1 ? 0 : index / (total - 1);
    const largeur = LARGEUR_BASE * (1 - progression * AFFINEMENT) * (0.86 + tirage() * 0.24);
    const hauteur = 10 + tirage() * 9;
    // Une pierre de base est posée à plat ; l'assise devient plus hasardeuse en
    // montant. Le décalage et l'inclinaison suivent donc la hauteur.
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
