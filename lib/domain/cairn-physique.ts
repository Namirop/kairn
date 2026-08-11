import { type Cadre } from "./cairn-collision";
import { type Mobile } from "./cairn-impulsions";
import { resoudre } from "./cairn-resolution";
import { LARGEUR_VUE, type Pierre } from "./cairn-stack";

/**
 * Chute des pierres du cairn.
 *
 * Fonctions pures : l'état d'un corps ne dépend que de son état précédent et du
 * pas de temps. Aucun accès à l'horloge, aucun aléatoire — le composant fournit
 * les deux, et deux exécutions du même geste donnent la même chute.
 *
 * Ce fichier intègre et range ; il ne décide pas des contacts. Les pierres se
 * heurtent, s'empilent et s'appuient sur le socle resté debout : c'est
 * `cairn-resolution` qui le résout, sur la géométrie de `cairn-collision`.
 *
 * Le repère est celui du viewBox : `y` croît vers le bas, le sol est à zéro.
 */

export type { Cadre } from "./cairn-collision";

export const CADRE_SERRE: Cadre = { gauche: 0, droite: LARGEUR_VUE };
export const CADRE_LARGE: Cadre = { gauche: -2 * LARGEUR_VUE, droite: 3 * LARGEUR_VUE };

/** Unités de viewBox par seconde au carré. */
const GRAVITE = 300;
/**
 * Ce qu'il faut pour qu'une pierre soit déclarée posée.
 *
 * Les seuils sont larges : un éboulis résolu par impulsions ne s'arrête jamais
 * tout à fait, et sur un dessin de cent unités de large, cinq unités par
 * seconde sont invisibles. Attendre le zéro parfait ferait tourner la boucle
 * d'animation longtemps après que tout ait l'air immobile.
 *
 * L'enfoncement compte autant que la vitesse : endormir une pierre encore
 * entrée d'une unité dans sa voisine fige exactement l'image qu'on corrige.
 * `SEUIL_FIGE` est la sortie de secours — une pierre coincée entre un bord et
 * le socle n'a nulle part où se dégager, et attendre l'impossible bloquerait la
 * boucle sur une image qui ne change plus.
 */
const SEUIL_REPOS = 5;
const SEUIL_ROTATION = 30;
const SEUIL_ENFONCEMENT = 0.6;
const SEUIL_FIGE = 0.35;
/** Ce qu'une pierre garde de sa vitesse d'une image à l'autre, au contact. */
const AMORTI_AU_CONTACT = 0.9;
const AMORTI_LENT = 0.72;
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
 * Déloge une pierre, et avec elle tout ce qu'elle portait : une pierre dont
 * l'assise part n'a aucune raison de rester en l'air.
 *
 * La pierre visée prend tout le coup, celles du dessus une part qui décroît
 * vite : de quoi pencher du bon côté, la gravité fait le reste. Leur donner la
 * même vitesse ferait glisser la pile d'un bloc maintenant qu'elles s'appuient
 * les unes sur les autres — le contraire d'un éboulement.
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
 * Le corps tel que le solveur le voit.
 *
 * Masse et inertie d'un rectangle plein de densité un : c'est leur rapport qui
 * compte, pas leur échelle. Une pierre large et plate bascule moins volontiers
 * qu'un galet, et c'est ce qu'on veut voir. Ce qui n'est pas libre reçoit une
 * masse infinie : le socle ne s'écroule pas parce qu'une pierre lui retombe
 * dessus, la coupure a déjà décidé de ce qui tombe.
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

    // Posée : elle touche quelque chose, elle en est ressortie, et elle n'a
    // plus de quoi bouger. Le reste de vitesse est coupé net plutôt que laissé
    // vibrer sous le seuil, sans quoi la boucle ne s'arrête jamais.
    const vitesse = Math.hypot(mobile.vx, mobile.vy);
    const immobile = vitesse < SEUIL_REPOS && Math.abs(mobile.vr) < SEUIL_ROTATION;
    const posee =
      appui.touche && immobile && (appui.enfoncement < SEUIL_ENFONCEMENT || vitesse < SEUIL_FIGE);

    // Une pierre appuyée et déjà lente est freinée jusqu'à l'arrêt. C'est le
    // frottement de contact, et c'est aussi ce qui garantit la fin : une pierre
    // coincée contre un bord et le socle vibrait de quelques dixièmes d'unité
    // par seconde indéfiniment, trop lente pour qu'on la voie bouger et trop
    // vive pour qu'on la déclare posée. La boucle tournait alors sans fin sur
    // une image immobile.
    const freine = posee || !appui.touche ? 1 : immobile ? AMORTI_LENT : AMORTI_AU_CONTACT;

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
