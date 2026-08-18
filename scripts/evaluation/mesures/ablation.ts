import type { Vecteur } from "./espace";
import { cosinus } from "./geometrie";

/**
 * L'épreuve de l'instrument par ablation.
 *
 * Avant de croire un chiffre, on prouve que la mesure réagit à ce qu'elle
 * prétend mesurer. Le test est direct : **on retire un concept d'un dépôt et on
 * regarde si les phrases qui s'appuyaient sur lui tombent sous le plancher.**
 * Si elles ne tombent pas, la couverture ne mesure pas la couverture, et les
 * quarante-trois manques signalés ne valent rien.
 *
 * Deux lectures, opposées, et il faut les deux :
 *
 * - sur un dépôt sain, un retrait **doit** découvrir des phrases. Chaque concept
 *   y porte quelque chose, donc son absence doit se voir.
 * - sur un dépôt à jumeaux, retirer un jumeau **ne doit pas** en découvrir : son
 *   double couvre les mêmes phrases. Ce contrôle négatif valide du même coup le
 *   signal de doublon — c'est la même géométrie vue de l'autre côté.
 *
 * Coût zéro : rien n'est plongé ici, tout vient du cache. Les vecteurs sont
 * déterministes, donc l'épreuve se rejoue autant qu'on veut.
 */

export type PhraseDecouverte = { texte: string; avant: number; apres: number };

export type Retrait = {
  /** Le concept retiré. */
  concept: string;
  /** Phrases qui passent sous le plancher du fait de ce retrait, les plus basses d'abord. */
  decouvertes: PhraseDecouverte[];
  /** Phrases dont ce concept était le plus proche — celles qu'il portait. */
  portees: number;
  /**
   * La plus forte chute de couverture causée par ce retrait, franchissement du
   * plancher ou non.
   *
   * C'est ce chiffre qui rend un « zéro découverte » interprétable, et sans lui
   * l'épreuve ne conclut rien. Une chute de 0,85 à 0,72 dit que la mesure a
   * parfaitement réagi et que le plancher est simplement plus bas que l'écart ;
   * une chute de 0,85 à 0,84 dit que deux concepts sont interchangeables aux
   * yeux de la géométrie. Les deux rendent « aucune phrase découverte », et il
   * ne faut surtout pas les confondre.
   */
  chuteMaximale: PhraseDecouverte | null;
};

export type Ablation = {
  nom: string;
  segments: number;
  concepts: number;
  /** Phrases déjà sous le plancher avant tout retrait : elles ne peuvent rien révéler. */
  dejaSous: number;
  retraits: Retrait[];
};

/**
 * La matrice des proximités, phrases en lignes, concepts en colonnes.
 *
 * Calculée une fois pour toutes : chaque retrait n'est plus qu'un maximum pris
 * sur les colonnes restantes, et l'épreuve entière tient en quelques
 * millisecondes même sur le dépôt à vingt concepts.
 */
function matrice(
  segments: string[],
  concepts: string[],
  vecteur: (texte: string) => Vecteur,
): number[][] {
  const colonnes = concepts.map(vecteur);

  return segments.map((segment) => {
    const point = vecteur(segment);

    return colonnes.map((colonne) => cosinus(point, colonne));
  });
}

/** Le maximum d'une ligne, une colonne étant ignorée. `null` s'il n'en reste aucune. */
function maximumSauf(ligne: number[], ignoree: number): number | null {
  let meilleur: number | null = null;

  ligne.forEach((valeur, colonne) => {
    if (colonne === ignoree || Number.isNaN(valeur)) return;
    if (meilleur === null || valeur > meilleur) meilleur = valeur;
  });

  return meilleur;
}

export function eprouverParAblation(
  nom: string,
  segments: string[],
  concepts: string[],
  vecteur: (texte: string) => Vecteur,
  plancher: number,
): Ablation {
  const proximites = matrice(segments, concepts, vecteur);
  const avant = proximites.map((ligne) => Math.max(...ligne.filter((v) => !Number.isNaN(v))));

  const retraits = concepts.map((concept, colonne) => {
    const decouvertes: PhraseDecouverte[] = [];
    let portees = 0;
    let chuteMaximale: PhraseDecouverte | null = null;

    segments.forEach((segment, rang) => {
      const proximiteAvant = avant[rang] ?? Number.NaN;
      const ligne = proximites[rang];

      if (Number.isNaN(proximiteAvant) || !ligne) return;

      const apres = maximumSauf(ligne, colonne);

      // Retirer le dernier concept d'un dépôt ne prouve rien : il ne reste
      // aucune cible, et la phrase ne « tombe » pas, elle n'a plus d'espace.
      if (apres === null) return;

      const chute = { texte: segment, avant: proximiteAvant, apres };

      // Ce concept portait la phrase si c'est lui qui donnait le maximum : sans
      // lui, le maximum baisse. L'égalité stricte suffit — deux concepts à la
      // même distance au flottant près ne se départagent pas, et compter les
      // deux serait moins faux que d'en compter un au hasard.
      if (apres < proximiteAvant) {
        portees += 1;

        if (
          chuteMaximale === null ||
          proximiteAvant - apres > chuteMaximale.avant - chuteMaximale.apres
        ) {
          chuteMaximale = chute;
        }
      }

      // Une phrase déjà sous le plancher ne peut rien révéler : elle y était.
      if (proximiteAvant >= plancher && apres < plancher) decouvertes.push(chute);
    });

    return {
      concept,
      decouvertes: decouvertes.sort((un, deux) => un.apres - deux.apres),
      portees,
      chuteMaximale,
    };
  });

  return {
    nom,
    segments: segments.length,
    concepts: concepts.length,
    dejaSous: avant.filter((valeur) => !Number.isNaN(valeur) && valeur < plancher).length,
    retraits,
  };
}
