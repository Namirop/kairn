import { type Cadre } from "./cairn-collision";
import { type Mobile } from "./cairn-impulsions";
import { resoudre, type Appui } from "./cairn-resolution";
import { LARGEUR_VUE, type Pierre } from "./cairn-stack";

/**
 * Chute des pierres du cairn.
 *
 * L'état d'un corps ne dépend que de son état précédent et du pas de temps,
 * fourni par le composant : le même geste donne la même chute. Ce fichier
 * intègre ; les contacts se résolvent dans `cairn-resolution`.
 *
 * Le repère est celui du viewBox : `y` croît vers le bas, le sol est à zéro.
 */

export type { Cadre } from "./cairn-collision";

export const CADRE_SERRE: Cadre = { gauche: 0, droite: LARGEUR_VUE };

/**
 * Le cairn de la page publique n'a pas de bords. Le dessin n'est pas centré
 * dans la fenêtre : tout bord fini, compté en unités de dessin, tombe soit hors
 * de l'écran soit en travers du texte, et les pierres s'y écrasent contre rien.
 * C'est le frottement au sol qui garantit la fin de la simulation.
 */
export const SANS_BORDS: Cadre = { gauche: -Infinity, droite: Infinity };

/** Unités de viewBox par seconde au carré. */
const GRAVITE = 300;
/**
 * Ce qu'il faut pour qu'une pierre soit déclarée posée.
 *
 * Seuils larges : un éboulis résolu par impulsions ne s'arrête jamais tout à
 * fait, et 5 unités/s sont invisibles sur un dessin de 100 de large. Une pierre
 * encore enfoncée dans sa voisine ne s'endort pas, sauf sous `SEUIL_FIGE` :
 * coincée entre un bord et le socle, elle ne peut pas se dégager.
 */
const SEUIL_REPOS = 5;
const SEUIL_ROTATION = 30;
const SEUIL_ENFONCEMENT = 0.6;
const SEUIL_FIGE = 0.35;
/**
 * Ce qu'une pierre garde de sa vitesse après une seconde de contact, et non
 * d'une image à l'autre : 0,9 par image ferait 0,9^60 par seconde, et la pierre
 * frappée s'arrêterait net en l'air. Élevé au pas de temps, l'amortissement ne
 * dépend pas non plus de la cadence d'affichage.
 */
const AMORTI_AU_CONTACT = 0.35;
/**
 * Le frein des pierres déjà lentes, bien plus mordant : il arrête celles qui
 * vibrent sous le seuil de repos sans jamais s'y poser, et garantit la fin.
 */
const AMORTI_LENT = 0.02;
/** Pas de temps maximal : un onglet qui reprend la main ne téléporte rien. */
const PAS_MAX = 1 / 30;

export type Corps = {
  x: number;
  y: number;
  rotation: number;
  vx: number;
  vy: number;
  /** Vitesse angulaire, en degrés par seconde. */
  vr: number;
  /** Vrai dès que la pierre a perdu son assise. */
  libre: boolean;
  /** Vrai quand elle a fini de bouger. */
  repos: boolean;
};

export type Impulsion = { vx: number; vy: number };

export function initialiser(pierres: Pierre[]): Corps[] {
  return pierres.map((pierre) => ({
    x: pierre.x,
    y: pierre.y,
    rotation: pierre.rotation,
    vx: 0,
    vy: 0,
    vr: 0,
    libre: false,
    repos: true,
  }));
}

/**
 * Déloge une pierre et tout ce qu'elle portait.
 *
 * Celles du dessus ne reçoivent qu'une part décroissante du coup : à vitesse
 * égale, la pile glisserait d'un bloc au lieu de s'ébouler.
 */
const SOUFFLE = 0.6;

export function renverser(corps: Corps[], index: number, impulsion: Impulsion): Corps[] {
  const sens = impulsion.vx >= 0 ? 1 : -1;

  return corps.map((solide, rang) => {
    if (rang < index || solide.libre) return solide;

    const part = rang === index ? 1 : SOUFFLE / (rang - index);

    return {
      ...solide,
      libre: true,
      repos: false,
      vx: solide.vx + impulsion.vx * part,
      vy: solide.vy + impulsion.vy * part * 0.5,
      vr: solide.vr + sens * (90 + rang * 25) * part,
    };
  });
}

/**
 * Le corps tel que le solveur le voit. Ce qui n'est pas libre a une masse
 * infinie : le socle ne s'écroule pas sous une pierre qui retombe, la coupure a
 * déjà décidé de ce qui tombe. Les pierres libres (`enMobile`) ont la masse et
 * l'inertie d'un rectangle plein de densité un.
 */
function enMur(solide: Corps, pierre: Pierre | undefined): Mobile {
  return {
    boite: {
      x: solide.x,
      y: solide.y,
      rotation: solide.rotation,
      largeur: pierre?.largeur ?? 0,
      hauteur: pierre?.hauteur ?? 0,
    },
    vx: 0,
    vy: 0,
    vr: 0,
    masseInverse: 0,
    inertieInverse: 0,
  };
}

function enMobile(solide: Corps, pierre: Pierre, pas: number): Mobile {
  const masse = pierre.largeur * pierre.hauteur;
  const inertie =
    (masse * (pierre.largeur * pierre.largeur + pierre.hauteur * pierre.hauteur)) / 12;
  const vy = solide.vy + GRAVITE * pas;

  return {
    boite: {
      largeur: pierre.largeur,
      hauteur: pierre.hauteur,
      x: solide.x + solide.vx * pas,
      y: solide.y + vy * pas,
      rotation: solide.rotation + solide.vr * pas,
    },
    vx: solide.vx,
    vy,
    vr: solide.vr,
    masseInverse: 1 / masse,
    inertieInverse: 1 / inertie,
  };
}

/**
 * Ce que devient une pierre libre une fois les contacts résolus : posée, freinée
 * ou laissée à sa course.
 */
function apresLeContact(mobile: Mobile, appui: Appui, pas: number): Corps {
  // Posée : le reste de vitesse est coupé net, sinon il vibre sous le seuil
  // et la boucle ne s'arrête jamais.
  const vitesse = Math.hypot(mobile.vx, mobile.vy);
  const immobile = vitesse < SEUIL_REPOS && Math.abs(mobile.vr) < SEUIL_ROTATION;
  const posee =
    appui.touche && immobile && (appui.enfoncement < SEUIL_ENFONCEMENT || vitesse < SEUIL_FIGE);

  // Appuyée et déjà lente, elle est freinée jusqu'à l'arrêt : sans ça, une
  // pierre coincée vibre indéfiniment, trop lente pour se voir et trop vive
  // pour être déclarée posée.
  const parSeconde = immobile ? AMORTI_LENT : AMORTI_AU_CONTACT;
  const freine = posee || !appui.touche ? 1 : parSeconde ** pas;

  return {
    x: mobile.boite.x,
    y: mobile.boite.y,
    rotation: mobile.boite.rotation,
    vx: posee ? 0 : mobile.vx * freine,
    vy: posee ? 0 : mobile.vy * freine,
    vr: posee ? 0 : mobile.vr * freine,
    libre: true,
    repos: posee,
  };
}

/** Avance la simulation d'un pas. `dt` est en secondes. */
export function avancer(
  corps: Corps[],
  pierres: Pierre[],
  dt: number,
  cadre: Cadre = CADRE_SERRE,
): Corps[] {
  const pas = Math.min(Math.max(dt, 0), PAS_MAX);

  if (pas === 0) return corps;

  const mobiles = corps.map((solide, index) => {
    const pierre = pierres[index];

    return solide.libre && pierre ? enMobile(solide, pierre, pas) : enMur(solide, pierre);
  });

  const appuis = resoudre(mobiles, cadre);

  return corps.map((solide, index) => {
    const mobile = mobiles[index];
    const appui = appuis[index];

    if (!solide.libre || !mobile || !appui || !pierres[index]) return solide;

    return apresLeContact(mobile, appui, pas);
  });
}

/** Vrai quand plus rien ne bouge. */
export function toutEstPose(corps: Corps[]): boolean {
  return corps.every((solide) => !solide.libre || solide.repos);
}

/** Vrai quand au moins une pierre est tombée. */
export function cairnRenverse(corps: Corps[]): boolean {
  return corps.some((solide) => solide.libre);
}
