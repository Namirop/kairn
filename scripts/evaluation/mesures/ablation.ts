import type { Vecteur } from "./espace";
import { cosinus } from "./geometrie";

/**
 * L'épreuve de l'instrument par ablation : on retire un concept d'un dépôt et
 * on regarde si les phrases qui s'appuyaient sur lui tombent sous le plancher.
 * Sinon, la couverture ne mesure pas la couverture.
 *
 * Un retrait doit déplacer la couverture : c'est ce que l'épreuve établit.
 * Elle ne contrôle pas le doublon : retirer un jumeau peut découvrir des
 * phrases, son double ne les couvre pas toujours.
 *
 * Coût zéro : tout vient du cache de vecteurs, déterministe.
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
   * La plus forte chute de couverture causée par ce retrait, plancher franchi
   * ou non. C'est elle qui rend un « zéro découverte » lisible : 0,85 → 0,72
   * dit que la mesure a réagi sous un plancher plus bas ; 0,85 → 0,84 dit que
   * deux concepts sont interchangeables pour la géométrie.
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
 * Les proximités, phrases en lignes, concepts en colonnes. Calculées une fois :
 * chaque retrait n'est plus qu'un maximum sur les colonnes restantes.
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

      // Retirer le seul concept ne prouve rien : il ne reste aucune cible.
      if (apres === null) return;

      const chute = { texte: segment, avant: proximiteAvant, apres };

      // Ce concept portait la phrase si, sans lui, le maximum baisse. Deux
      // concepts exactement à égalité ne la portent donc ni l'un ni l'autre.
      if (apres < proximiteAvant) {
        portees += 1;

        if (
          chuteMaximale === null ||
          proximiteAvant - apres > chuteMaximale.avant - chuteMaximale.apres
        ) {
          chuteMaximale = chute;
        }
      }

      // Une phrase déjà sous le plancher ne peut rien révéler.
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
