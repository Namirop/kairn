import { empiler, LARGEUR_VUE, type Pierre } from "./cairn-empilement";

/**
 * Le sentier : plusieurs cairns côte à côte plutôt qu'un empilement sans fin.
 *
 * La boîte d'un empilement a une largeur fixe : au-delà d'une douzaine de
 * pierres, le dessin s'amincit en aiguille et devient illisible. Passé
 * `PIERRES_PAR_CAIRN`, la pierre suivante ouvre un cairn à droite.
 *
 * Le remplissage est séquentiel, jamais réparti : une répartition équilibrée
 * ferait sauter les pierres d'un cairn à l'autre à chaque ajout, et le sentier
 * doit rester stable dans le temps.
 */

/** Au-delà, la pierre suivante ouvre un cairn de plus. */
export const PIERRES_PAR_CAIRN = 10;

/**
 * L'écart entre deux cairns, en unités de vue. La pierre la plus large fait
 * soixante sur cent : quatorze laisse respirer sans séparer les deux cairns.
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

/** Le découpage d'un total en cairns successifs. */
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
 * Les graines de chaque pierre, indexées sur le sentier entier : indexées par
 * cairn, deux cairns seraient identiques et deux pierres porteraient la même
 * clé. Le premier cairn reste ainsi identique à ce qu'`empiler` produit seul.
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
