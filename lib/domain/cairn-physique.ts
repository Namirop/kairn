import { type Cadre } from "./cairn-collision";
import { type Mobile } from "./cairn-impulsions";
import { resoudre, type Appui } from "./cairn-resolution";
import { LARGEUR_VUE, type Pierre } from "./cairn-empilement";

/**
 * Chute des pierres du cairn : intégration seule, les contacts se résolvent
 * dans `cairn-resolution`. Le pas de temps vient du composant, donc le même
 * geste donne la même chute. Repère du viewBox : `y` vers le bas, sol à zéro.
 */

export type { Cadre } from "./cairn-collision";

export const CADRE_SERRE: Cadre = { gauche: 0, droite: LARGEUR_VUE };

/**
 * Pour la page publique : le dessin n'y est pas centré, et tout bord fini
 * tomberait hors de l'écran ou en travers du texte. Le frottement au sol suffit
 * à terminer la simulation.
 */
export const SANS_BORDS: Cadre = { gauche: -Infinity, droite: Infinity };

/** Unités de viewBox par seconde au carré. */
const GRAVITE = 300;
/**
 * Seuils de pose, larges : un éboulis par impulsions ne s'arrête jamais tout à
 * fait, et 5 unités/s sont invisibles sur 100 de large. Une pierre enfoncée ne
 * s'endort que sous `SEUIL_FIGE`, cas d'une pierre coincée qui ne peut se dégager.
 */
const SEUIL_REPOS = 5;
const SEUIL_ROTATION = 30;
const SEUIL_ENFONCEMENT = 0.6;
const SEUIL_FIGE = 0.35;
/**
 * La vitesse gardée après une seconde de contact, pas par image : élevée au pas
 * de temps, elle ne dépend pas de la cadence d'affichage.
 */
const AMORTI_AU_CONTACT = 0.35;
/** Plus mordant, pour les pierres lentes qui vibreraient sans jamais se poser. */
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

/** Un corps posé sur sa pierre, immobile. */
export function poser(pierre: Pierre): Corps {
  return {
    x: pierre.x,
    y: pierre.y,
    rotation: pierre.rotation,
    vx: 0,
    vy: 0,
    vr: 0,
    libre: false,
    repos: true,
  };
}

export function initialiser(pierres: Pierre[]): Corps[] {
  return pierres.map(poser);
}

/**
 * Les pierres du dessus reçoivent une part décroissante du coup : à vitesse
 * égale, la pile glisserait d'un bloc au lieu de s'ébouler.
 */
const SOUFFLE = 0.6;

/** Déloge une pierre et tout ce qu'elle portait. */
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
 * Masse infinie pour ce qui n'est pas libre : le socle ne s'écroule pas sous une
 * pierre qui retombe, la coupure a déjà décidé de ce qui tombe.
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

/** Un rectangle plein de densité un. */
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

/** Posée, freinée ou laissée à sa course. */
function apresLeContact(mobile: Mobile, appui: Appui, pas: number): Corps {
  // Posée, la vitesse est coupée net : un reste vibrerait sans fin sous le seuil.
  const vitesse = Math.hypot(mobile.vx, mobile.vy);
  const immobile = vitesse < SEUIL_REPOS && Math.abs(mobile.vr) < SEUIL_ROTATION;
  const posee =
    appui.touche && immobile && (appui.enfoncement < SEUIL_ENFONCEMENT || vitesse < SEUIL_FIGE);

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

/** `dt` est en secondes. */
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

export function toutEstPose(corps: Corps[]): boolean {
  return corps.every((solide) => !solide.libre || solide.repos);
}

export function cairnRenverse(corps: Corps[]): boolean {
  return corps.some((solide) => solide.libre);
}
