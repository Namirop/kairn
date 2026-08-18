import type { ConceptFige, DepotFige } from "./fige";
import { jugerLeResidu } from "./juges/residu";
import type { Vecteur } from "./mesures/espace";
import { plusProche } from "./mesures/geometrie";
import { PLANCHER_COUVERTURE } from "./mesures/seuils";
import type { Rapproche } from "./mesures/signaux";

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
 * subordonnée, au milieu d'une phrase dont le sujet apparent est ailleurs. Un
 * extracteur pressé produira « les tomates ne vont pas au réfrigérateur » et
 * perdra le fait qui rend la règle importante.
 *
 * `22-article-long.md` porte six mécanismes énumérables sur les feux de forêt.
 * Le juge de résidu vient d'en confirmer cinq manques dessus au 18 août :
 * c'est le comportement voulu, les attendus existent pour **garder ce trou
 * visible d'un passage à l'autre**, pas pour être satisfaits. Ne pas les
 * adoucir pour les faire passer.
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
  /** Le concept le plus proche, ou `null` si le dépôt n'en porte aucun. */
  voisin: string | null;
  /** Proximité vers le voisin. `null` sans concept. */
  proximite: number | null;
  /** Vrai si `proximite ≥ PLANCHER_COUVERTURE`, ce qui vaut « couvert par proximité ». */
  couvertParProximite: boolean;
  /**
   * Verdict du juge de résidu quand l'attendu est passé au repli. Absent quand
   * la proximité seule tranchait, ou quand aucun juge n'a tourné.
   */
  verdict?: { manqueReel: boolean; motif: string };
};

/**
 * La couverture des attendus d'un dépôt par ses concepts.
 *
 * Même géométrie que la couverture des phrases (§3 de la fiche) et **même
 * plancher** : on regarde si l'attendu s'approche d'un concept au-dessus du
 * seuil calibré pour la couverture phrase→concept. Sous ce seuil, le repli
 * juge tranche.
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
    const trouve = plusProche(vecteur(attendu), vecteursConcepts);

    if (trouve === null) {
      return { attendu, voisin: null, proximite: null, couvertParProximite: false };
    }

    const proximite = trouve.proximite;

    return {
      attendu,
      voisin: textesConcepts[trouve.rang] ?? null,
      proximite,
      couvertParProximite: proximite >= PLANCHER_COUVERTURE,
    };
  });
}

/**
 * Le repli juge : les attendus sous plancher passent au juge de résidu.
 *
 * On reformule chaque attendu comme un candidat au manque — même question au
 * fond : « cette idée est-elle portée par les concepts du dépôt ? ». Un
 * attendu est par construction une idée qui mérite d'être retenue, donc le
 * verdict `retenir` du juge se lit ici comme `manqueReel` : oui, cette idée
 * n'est couverte par aucun concept.
 *
 * Un dépôt sans attendu en doute ne fait pas d'appel : `jugerLeResidu` le
 * saute lui-même quand ses listes sont vides. Un dépôt dont tous les attendus
 * sont couverts par proximité passe directement.
 */
export async function jugerLesAttendusEnDoute(
  depot: DepotFige,
  couvertures: CouvertureAttendu[],
): Promise<CouvertureAttendu[]> {
  const enDoute = couvertures.filter((c) => !c.couvertParProximite);
  if (enDoute.length === 0) return couvertures;

  const manques: Rapproche[] = enDoute.map((c) => ({
    texte: c.attendu,
    voisin: c.voisin ?? "",
    proximite: c.proximite ?? 0,
  }));

  const sortie = await jugerLeResidu(depot.nom, depot.texte, manques, []);
  const verdictParAttendu = new Map(
    enDoute.map((c, rang) => {
      const verdict = sortie.manques[rang];
      if (!verdict) throw new Error(`Verdict manquant pour l'attendu #${rang + 1} de ${depot.nom}.`);
      return [c.attendu, verdict];
    }),
  );

  return couvertures.map((c) => {
    const verdict = verdictParAttendu.get(c.attendu);
    if (!verdict) return c;

    return {
      ...c,
      verdict: { manqueReel: verdict.retenir, motif: verdict.motif },
    };
  });
}
