import { LARGEUR_VUE, type Pierre } from "./cairn-stack";

/**
 * Chute des pierres du cairn.
 *
 * Fonctions pures : l'état d'un corps ne dépend que de son état précédent et du
 * pas de temps. Aucun accès à l'horloge, aucun aléatoire — le composant fournit
 * les deux, et deux exécutions du même geste donnent la même chute.
 *
 * Le repère est celui du viewBox : `y` croît vers le bas, le sol est à zéro, et
 * une pierre au repos a son centre à `-hauteur / 2`.
 */

/** Unités de viewBox par seconde au carré. */
const GRAVITE = 300;
/** Part de vitesse conservée au rebond. */
const REBOND = 0.24;
/** Frottement appliqué au contact du sol. */
const GLISSE = 0.68;
/** En deçà, une pierre posée est considérée immobile. */
const SEUIL_REPOS = 2;
/** Marge conservée contre les bords du cadre. */
const MARGE = 4;
/** Pas de temps maximal : un onglet qui reprend la main ne téléporte rien. */
const PAS_MAX = 1 / 30;

/**
 * Les bords entre lesquels les pierres tombent, en unités de viewBox.
 *
 * Le cairn du tableau de bord n'a pas à quitter son dessin. Celui de la page
 * publique, si : l'enfermer dans la largeur de son propre SVG le faisait
 * rebondir sur des murs qu'on ne voyait pas, ni contenu ni libre.
 */
export type Cadre = { gauche: number; droite: number };

export const CADRE_SERRE: Cadre = { gauche: 0, droite: LARGEUR_VUE };
export const CADRE_LARGE: Cadre = { gauche: -2 * LARGEUR_VUE, droite: 3 * LARGEUR_VUE };

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
 * Déloge une pierre, et avec elle tout ce qu'elle portait : une pierre dont
 * l'assise part n'a aucune raison de rester en l'air.
 */
export function renverser(corps: Corps[], index: number, impulsion: Impulsion): Corps[] {
  const sens = impulsion.vx >= 0 ? 1 : -1;

  return corps.map((solide, rang) => {
    if (rang < index || solide.libre) return solide;

    // Les pierres du dessus tombent un peu plus mollement, et vers le même
    // côté : c'est ce qui fait lire un effondrement plutôt qu'une explosion.
    const attenuation = rang === index ? 1 : 0.45 / (rang - index);

    return {
      ...solide,
      libre: true,
      repos: false,
      vx: solide.vx + impulsion.vx * attenuation,
      vy: solide.vy + impulsion.vy * attenuation * 0.5,
      vr: solide.vr + sens * (90 + rang * 25) * attenuation,
    };
  });
}

/**
 * Demi-encombrement d'une pierre inclinée, sur chaque axe.
 *
 * Une pierre couchée à quarante degrés déborde vers le bas de bien plus que sa
 * demi-hauteur : c'est sa diagonale qui touche le sol. La demi-hauteur seule
 * faisait donc enfoncer dans le sol toute pierre qui ne finissait pas à plat —
 * et une chute produit surtout des pierres qui ne finissent pas à plat.
 */
export function demiEmprise(pierre: Pierre, rotation: number): { x: number; y: number } {
  const angle = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));

  return {
    x: (cos * pierre.largeur + sin * pierre.hauteur) / 2,
    y: (cos * pierre.hauteur + sin * pierre.largeur) / 2,
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

  // Sans temps écoulé, rien ne change — pas même la résolution du contact au
  // sol. Une pierre de base est posée à sa demi-hauteur sans tenir compte de son
  // inclinaison : la corriger sur un pas nul ferait sursauter l'empilement à
  // l'instant précis où on le touche, avant toute chute.
  if (pas === 0) return corps;

  return corps.map((solide, index) => {
    const pierre = pierres[index];
    if (!solide.libre || solide.repos || !pierre) return solide;

    let { x, y, rotation, vx, vy, vr } = solide;

    vy += GRAVITE * pas;
    x += vx * pas;
    y += vy * pas;
    rotation += vr * pas;

    const demi = demiEmprise(pierre, rotation);
    const demiH = demi.y;

    // Bords du cadre.
    const minX = cadre.gauche + MARGE + demi.x;
    const maxX = cadre.droite - MARGE - demi.x;
    if (x < minX || x > maxX) {
      x = Math.min(Math.max(x, minX), maxX);
      vx = -vx * REBOND;
    }

    // Sol.
    if (y > -demiH) {
      y = -demiH;
      vx *= GLISSE;
      vr *= GLISSE;
      vy = Math.abs(vy) < SEUIL_REPOS * 4 ? 0 : -vy * REBOND;

      if (vy === 0 && Math.abs(vx) < SEUIL_REPOS && Math.abs(vr) < SEUIL_REPOS * 8) {
        return { x, y, rotation, vx: 0, vy: 0, vr: 0, libre: true, repos: true };
      }
    }

    return { x, y, rotation, vx, vy, vr, libre: true, repos: false };
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

/**
 * Ramène les pierres à leur place. Interpolation et non simulation : on ne
 * remonte pas un cairn en lançant des pierres vers le haut.
 */
export function remonter(corps: Corps[], pierres: Pierre[], dt: number): Corps[] {
  const facteur = 1 - Math.exp(-6 * Math.min(Math.max(dt, 0), PAS_MAX));

  return corps.map((solide, index) => {
    const pierre = pierres[index];
    if (!solide.libre || !pierre) return solide;

    const x = solide.x + (pierre.x - solide.x) * facteur;
    const y = solide.y + (pierre.y - solide.y) * facteur;
    const rotation = solide.rotation + (pierre.rotation - solide.rotation) * facteur;
    const arrive =
      Math.abs(x - pierre.x) < 0.3 &&
      Math.abs(y - pierre.y) < 0.3 &&
      Math.abs(rotation - pierre.rotation) < 0.5;

    if (arrive) {
      return { ...initialiser([pierre])[0]! };
    }

    return { ...solide, x, y, rotation, vx: 0, vy: 0, vr: 0, repos: false };
  });
}
