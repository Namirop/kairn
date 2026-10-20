import { empiler, LARGEUR_VUE, type Pierre } from "./cairn-empilement";

/**
 * Plusieurs cairns côte à côte : à largeur fixe, un empilement de plus d'une
 * douzaine de pierres s'amincit en aiguille. Le remplissage est séquentiel,
 * jamais équilibré, pour que les pierres ne sautent pas d'un cairn à l'autre à
 * chaque ajout.
 */

export const PIERRES_PAR_CAIRN = 10;

/** En unités de vue ; la pierre la plus large fait soixante sur cent. */
const ECART = 14;

export type CairnDuSentier = {
  pierres: Pierre[];
  /** En unités de vue. */
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
  total: number;
};

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
 * Indexées sur le sentier entier : par cairn, deux cairns seraient identiques et
 * deux pierres porteraient la même clé.
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

  // La place d'un cairn, pour que la boîte garde ses proportions à la première pierre.
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
