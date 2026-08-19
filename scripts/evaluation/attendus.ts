import type { ConceptFige } from "./fige";
import type { Vecteur } from "./mesures/espace";
import { plusProches } from "./mesures/geometrie";
import { PLANCHER_COUVERTURE } from "./mesures/seuils";

/**
 * Les idées qu'on attend d'un dépôt.
 *
 * C'est le **seul endroit du banc où une référence est légitime** (fiche
 * instrument §8) : deux fichiers seulement, écrits par nous, dont les idées
 * clefs sont énumérables. Le reste du corpus n'a pas d'attendus, et n'en aura
 * pas — sinon on mesurerait ce qu'on a déjà écrit.
 *
 * `27-idee-enfouie.txt` est le cas d'école du manque : l'idée principale
 * (l'irréversibilité de la perte d'arôme sous 12 °C) est glissée en
 * subordonnée, au milieu d'une phrase dont le sujet apparent est ailleurs.
 *
 * `22-article-long.md` porte six mécanismes énumérables sur les feux de forêt.
 * Les attendus existent pour **garder les trous visibles d'un passage à
 * l'autre**, pas pour être satisfaits. Ne pas les adoucir pour les faire
 * passer.
 */

export const ATTENDUS: Readonly<Record<string, readonly string[]>> = {
  "27-idee-enfouie.txt": [
    "Le bac à légumes maintient une humidité plus haute que le reste du réfrigérateur, ce qui empêche les feuilles de se dessécher.",
    "Sous 12 °C, les enzymes d'arôme de la tomate sont détruites sans retour — une tomate réfrigérée ne retrouve jamais son goût.",
    "Au froid, une partie de l'amidon des pommes de terre se transforme en sucres — goût modifié, brunissement à la cuisson.",
    "Les oignons accélèrent la germination des pommes de terre.",
    "Les fruits mûrissants dégagent de l'éthylène qui fait mûrir ce qui les entoure, utilisable dans les deux sens.",
  ],
  "22-article-long.md": [
    "Trois régimes de feu : litière, cime, et l'échelle intermédiaire qui conduit de l'un à l'autre.",
    "Le paradoxe de la suppression : un siècle d'extinction systématique a accumulé la biomasse et fait passer les forêts d'un régime de feux fréquents et faibles à un régime rare et catastrophique.",
    "L'humidité de la végétation morte est le premier paramètre ; sous environ 10 %, une brindille s'enflamme au contact d'une étincelle.",
    "Vent et pente inclinent la flamme et préchauffent la végétation avant contact ; un doublement de pente peut quadrupler la vitesse.",
    "La rupture d'une inversion thermique est le pire cas : colonne convective, le feu fabrique son propre vent.",
    "Le pyrocumulonimbus produit des éclairs qui allument des départs à distance ; les braises franchissent routes, rivières et pare-feux.",
  ],
} as const;

/** Le nombre de concepts candidats soumis au juge par attendu. */
export const CANDIDATS_PAR_ATTENDU = 2;

/** Les attendus d'un dépôt. Vide s'il n'y en a pas — la plupart des dépôts. */
export function attendusDuDepot(nom: string): readonly string[] {
  return ATTENDUS[nom] ?? [];
}

/** Tous les attendus du corpus, pour la passe de plongée. */
export function tousLesAttendus(): string[] {
  return Object.values(ATTENDUS).flat();
}

export type CouvertureAttendu = {
  attendu: string;
  /** Les concepts candidats retenus par proximité — jusqu'à `CANDIDATS_PAR_ATTENDU`. */
  candidats: { concept: string; proximite: number }[];
  /**
   * Vrai si le plus proche candidat passe le plancher couverture. Utilisé en
   * interne comme signal ; le rapport n'en fait plus mention — c'est le juge
   * qui tranche, la proximité ne fait que sélectionner les candidats.
   */
  couvertParProximite: boolean;
  /**
   * Verdict du juge d'attendus. Absent quand aucun juge n'a tourné.
   * `couvert: null` = abstention (item non rendu par le juge).
   */
  verdict?: { couvert: boolean | null; motif: string };
};

/**
 * La couverture des attendus d'un dépôt par ses concepts, avant tout juge.
 *
 * On désigne les {@link CANDIDATS_PAR_ATTENDU} concepts les plus proches par
 * proximité — la géométrie sélectionne. Le verdict de couverture, lui, viendra
 * du juge (voir `juges/attendus.ts`) : le cosinus mesure le même sujet, pas
 * la même affirmation.
 *
 * Un dépôt sans attendu rend un tableau vide sans plonger quoi que ce soit —
 * la plupart des dépôts.
 */
export function couvertureDesAttendus(
  nom: string,
  concepts: ConceptFige[],
  vecteur: (texte: string) => Vecteur,
): CouvertureAttendu[] {
  const attendus = attendusDuDepot(nom);
  if (attendus.length === 0) return [];

  const textesConcepts = concepts.map((concept) => concept.concept);
  const vecteursConcepts = textesConcepts.map(vecteur);

  return attendus.map((attendu) => {
    const proches = plusProches(vecteur(attendu), vecteursConcepts, CANDIDATS_PAR_ATTENDU);
    const candidats = proches
      .map((proche) => ({
        concept: textesConcepts[proche.rang] ?? "",
        proximite: proche.proximite,
      }))
      .filter((c) => c.concept !== "");
    const meilleur = candidats[0];

    return {
      attendu,
      candidats,
      couvertParProximite: meilleur !== undefined && meilleur.proximite >= PLANCHER_COUVERTURE,
    };
  });
}
