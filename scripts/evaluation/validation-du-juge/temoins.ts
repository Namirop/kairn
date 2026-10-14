import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ConceptFige, DepotFige, VariantFige } from "../fige";

/**
 * Les entrées de l'arrêt 1 : les paires témoins du doublon, les lots de la
 * fidélité, et leur lecture dans le figé `2026-08-20-11h58` et ses verdicts
 * Haiku.
 */

type AttenduDoublon = "independants" | "non independants";

export type PaireTemoin = {
  depot: string;
  /** Indices 1-based des concepts A et B dans `depot.concepts`. */
  conceptA: number;
  conceptB: number;
  attendu: AttenduDoublon;
  /** Une ligne pour lire le tableau sans le figé sous les yeux. */
  intitule: string;
};

/** Les six paires témoins de l'arrêt 1, exactement celles de la fiche. */
export const PAIRES_TEMOINS: PaireTemoin[] = [
  {
    depot: "05-affirmation-fausse.txt",
    conceptA: 2,
    conceptB: 1,
    attendu: "independants",
    intitule: "CREATE INDEX verrou ↔ comportement à l'interruption",
  },
  {
    depot: "09-fait-pratique.txt",
    conceptA: 1,
    conceptB: 2,
    attendu: "independants",
    intitule: "courbes-même-altitude ↔ équidistance",
  },
  {
    depot: "11-sigles-scientifiques.txt",
    conceptA: 1,
    conceptB: 2,
    attendu: "independants",
    intitule: "catégorisation 3 bandes ↔ UVC/ozone",
  },
  {
    depot: "11-sigles-scientifiques.txt",
    conceptA: 1,
    conceptB: 4,
    attendu: "independants",
    intitule: "catégorisation 3 bandes ↔ UVA/derme",
  },
  {
    depot: "15-redondance-interne.txt",
    conceptA: 2,
    conceptB: 3,
    attendu: "non independants",
    intitule: "les jumeaux du rassasiement",
  },
  {
    depot: "16-concepts-imbriques.txt",
    conceptA: 1,
    conceptB: 2,
    attendu: "non independants",
    intitule: "fond épais ↔ sauce qui attache",
  },
];

type CategorieLot = "propre" | "infidele" | "moyen";

export type LotFidelite = {
  depot: string;
  /** Indice 1-based du concept dans `depot.concepts`. */
  concept: number;
  categorie: CategorieLot;
  /** Le nombre de KO rendus par Haiku au rapport `11h58`, pour la comparaison. */
  koHaiku: number;
};

/** Les six lots fidélité de l'arrêt 1. */
export const LOTS_FIDELITE: LotFidelite[] = [
  { depot: "04-explication-maladroite.txt", concept: 1, categorie: "propre", koHaiku: 0 },
  { depot: "18-anglais.txt", concept: 1, categorie: "propre", koHaiku: 0 },
  { depot: "08-observation-scientifique.txt", concept: 3, categorie: "infidele", koHaiku: 1 },
  { depot: "27-idee-enfouie.txt", concept: 3, categorie: "infidele", koHaiku: 1 },
  { depot: "02-paragraphe-technique.txt", concept: 1, categorie: "moyen", koHaiku: 0 },
  { depot: "10-notes-decousues.txt", concept: 1, categorie: "moyen", koHaiku: 0 },
];

export function extrairePaire(
  fige: { depots: DepotFige[] },
  temoin: PaireTemoin,
): { un: string; deux: string; proximite: number } {
  const depot = fige.depots.find((d) => d.nom === temoin.depot);
  if (!depot) throw new Error(`Dépôt introuvable dans le figé : ${temoin.depot}`);
  const a = depot.concepts[temoin.conceptA - 1];
  const b = depot.concepts[temoin.conceptB - 1];
  if (!a || !b) {
    throw new Error(
      `Concept manquant sur ${temoin.depot} — demandés ${temoin.conceptA} et ${temoin.conceptB}, présents ${depot.concepts.length}.`,
    );
  }
  return { un: a.concept, deux: b.concept, proximite: 0 };
}

export function extraireConcept(
  fige: { depots: DepotFige[] },
  lot: LotFidelite,
): { concept: string; variants: VariantFige[] } {
  const depot = fige.depots.find((d) => d.nom === lot.depot);
  if (!depot) throw new Error(`Dépôt introuvable dans le figé : ${lot.depot}`);
  const brut: ConceptFige | undefined = depot.concepts[lot.concept - 1];
  if (!brut) {
    throw new Error(
      `Concept ${lot.concept} manquant sur ${lot.depot} — présents ${depot.concepts.length}.`,
    );
  }
  if (!brut.variants || brut.variants.length === 0) {
    throw new Error(
      `Concept ${lot.concept} de ${lot.depot} n'a pas de questions figées — arrêt 1 impossible sur ce lot.`,
    );
  }
  return { concept: brut.concept, variants: brut.variants };
}

const VERDICTS_HAIKU: {
  depots: Record<string, { fidelite: Record<string, { juste: boolean | null }[]> }>;
} = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "verdicts", "2026-08-20-11h58.json"), "utf8"),
);

/** Les verdicts Haiku d'un lot, tels que sauvegardés dans `verdicts/…json`. */
export function lireVerdictsHaiku(lot: LotFidelite): (boolean | null)[] {
  const depot = VERDICTS_HAIKU.depots[lot.depot];
  if (!depot) throw new Error(`Verdicts introuvables pour ${lot.depot}`);
  const concepts = Object.keys(depot.fidelite);
  const clef = concepts[lot.concept - 1];
  if (!clef) throw new Error(`Verdicts introuvables pour ${lot.depot} concept ${lot.concept}`);
  const rendus = depot.fidelite[clef];
  if (!rendus) throw new Error(`Verdicts vides pour ${lot.depot} concept ${lot.concept}`);
  return rendus.map((v) => v.juste);
}
