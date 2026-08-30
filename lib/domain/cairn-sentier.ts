import { empiler, LARGEUR_VUE, type Pierre } from "./cairn-stack";

/**
 * Le sentier : plusieurs cairns côte à côte plutôt qu'un empilement sans fin.
 *
 * Un empilement compte une pierre par concept retenu, et sa boîte a une largeur
 * fixe pendant que sa hauteur, elle, grandit sans limite. Passé une douzaine de
 * pierres, le dessin se rétrécit en aiguille : à vingt c'est un bâton, à
 * cinquante un fil de deux pierres de large. Ce n'est plus un cairn, et surtout
 * on ne distingue plus ce qui est posé sur quoi.
 *
 * Un cairn n'a jamais grandi indéfiniment. On en bâtit un autre plus loin, et
 * c'est l'alignement qui balise le chemin — c'est la métaphore du produit,
 * prise au mot. Passé `PIERRES_PAR_CAIRN`, la pierre suivante ouvre donc un
 * cairn de plus, à droite du précédent.
 *
 * Le remplissage est **séquentiel**, jamais réparti : les dix premiers concepts
 * font le premier cairn, les dix suivants le second. Une répartition équilibrée
 * redistribuerait les pierres à chaque ajout, et comme la forme de chacune est
 * tirée de son concept, on verrait les pierres sauter d'un cairn à l'autre. Le
 * sentier de quelqu'un doit être stable dans le temps.
 */

/** Au-delà, la pierre suivante ouvre un cairn de plus. */
export const PIERRES_PAR_CAIRN = 10;

/**
 * L'écart entre deux cairns, en unités de vue.
 *
 * La pierre la plus large en fait soixante sur cent : un écart de quatorze
 * laisse donc respirer sans que les deux empilements aient l'air posés sur deux
 * sentiers différents.
 */
const ECART = 14;

export type CairnDuSentier = {
  pierres: Pierre[];
  /** Décalage horizontal de ce cairn, en unités de vue. */
  decalage: number;
  /** Rang de sa première pierre dans le sentier entier, pour l'ordre de pose. */
  premierRang: number;
};

export type Sentier = {
  cairns: CairnDuSentier[];
  /** Largeur de la vue : elle grandit d'un cairn à l'autre, jamais d'une pierre. */
  largeur: number;
  hauteur: number;
  ySol: number;
  /** Pierres posées, tous cairns confondus. */
  total: number;
};

/**
 * Le découpage d'un total en cairns successifs.
 *
 * Séparé du tracé parce que c'est la seule règle qu'on aura envie de discuter :
 * le palier se règle ici, et le dessin suit.
 */
export function repartirEnCairns(nombre: number, parCairn: number = PIERRES_PAR_CAIRN): number[] {
  const total = Math.max(0, Math.floor(nombre));
  const taille = Math.max(1, Math.floor(parCairn));
  const tas: number[] = [];

  for (let reste = total; reste > 0; reste -= taille) {
    tas.push(Math.min(taille, reste));
  }

  return tas;
}

/**
 * Les graines de chaque pierre, indexées sur le sentier entier.
 *
 * Sans elles, chaque cairn repartirait de la graine par défaut de son premier
 * rang : deux cairns identiques, et deux pierres portant la même clé. Les
 * indices restent donc globaux, ce qui rend aussi le premier cairn identique à
 * ce qu'`empiler` produisait seul.
 */
function grainesDuSentier(total: number, graines?: string[]): string[] {
  return Array.from({ length: total }, (_, rang) => graines?.[rang] ?? `cairn-pierre-${rang}`);
}

export function tracerLeSentier(
  nombre: number,
  graines?: string[],
  parCairn: number = PIERRES_PAR_CAIRN,
): Sentier {
  const tas = repartirEnCairns(nombre, parCairn);

  // Un sentier vide garde la place d'un cairn : la boîte ne change pas de
  // proportions entre zéro pierre et une.
  if (tas.length === 0) {
    const vide = empiler(0);
    return { cairns: [], largeur: LARGEUR_VUE, hauteur: vide.hauteur, ySol: vide.ySol, total: 0 };
  }

  const total = tas.reduce((somme, combien) => somme + combien, 0);
  const toutes = grainesDuSentier(total, graines);
  const cairns: CairnDuSentier[] = [];
  let hauteur = 0;
  let ySol = 0;
  let poses = 0;

  tas.forEach((combien, rang) => {
    const empilement = empiler(combien, toutes.slice(poses, poses + combien));

    cairns.push({
      pierres: empilement.pierres,
      decalage: rang * (LARGEUR_VUE + ECART),
      premierRang: poses,
    });
    hauteur = Math.max(hauteur, empilement.hauteur);
    ySol = empilement.ySol;
    poses += combien;
  });

  return {
    cairns,
    largeur: tas.length * LARGEUR_VUE + (tas.length - 1) * ECART,
    hauteur,
    ySol,
    total,
  };
}
