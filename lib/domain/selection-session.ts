import { jourSuivant, jourLocal } from "./jour-local";
import { bornerLeNeuf } from "./part-de-nouveaute";
import { parUrgence } from "./urgence-de-revision";

/**
 * Ce qui compose une session. Un concept est dû selon le jour civil de
 * l'utilisateur, pas en UTC. La session ne se complète jamais avec des concepts
 * non échus : être à jour est un état normal.
 */

/**
 * Au-delà, la session devient une corvée qu'on abandonne. Par journée et non par
 * ouverture d'écran, sinon recharger en donnerait vingt de plus.
 */
export const PLAFOND_SESSION = 20;

/** Sous cinq, l'arriéré grossit mécaniquement ; au-delà de cinquante, personne ne tient. */
export const PLAFOND_MIN = 5;
export const PLAFOND_MAX = 50;

/** `null` plutôt qu'une exception : l'appelant est un formulaire. */
export function lirePlafondDeSession(saisie: string): number | null {
  const trouve = /^\s*(\d{1,3})\s*$/.exec(saisie);

  if (!trouve) return null;

  const plafond = Number.parseInt(trouve[1] ?? "", 10);

  if (Number.isNaN(plafond) || plafond < PLAFOND_MIN || plafond > PLAFOND_MAX) return null;

  return plafond;
}

export type ConceptDu = {
  id: string;
  due: Date;
  tags: string[];
  /** Sert de sujet quand le concept n'a pas de tag. */
  inputId: string;
  /** Quel qu'en ait été le résultat. */
  lastReview: Date | null;
  /** En jours. Zéro pour un concept neuf. */
  scheduledDays: number;
};

export function estDu(due: Date, maintenant: Date, fuseau: string): boolean {
  // Au format AAAA-MM-JJ, l'ordre lexicographique est l'ordre chronologique.
  return jourLocal(due, fuseau) <= jourLocal(maintenant, fuseau);
}

/**
 * ts-fsrs replanifie un concept en apprentissage à quelques minutes : sans cette
 * règle, la session le reposerait dans la foulée et ne finirait jamais.
 */
export function dejaRevuAujourdhui(
  lastReview: Date | null,
  maintenant: Date,
  fuseau: string,
): boolean {
  if (!lastReview) return false;

  return jourLocal(lastReview, fuseau) === jourLocal(maintenant, fuseau);
}

/** Le prédicat unique : tout ce qui compte des concepts passe par ici, deux définitions divergeraient. */
export function estServableAujourdhui(
  concept: Pick<ConceptDu, "due" | "lastReview">,
  maintenant: Date,
  fuseau: string,
): boolean {
  return (
    estDu(concept.due, maintenant, fuseau) &&
    !dejaRevuAujourdhui(concept.lastReview, maintenant, fuseau)
  );
}

/** Pas son échéance : un concept revu aujourd'hui en porte une dans la journée, mais revient demain. */
export function jourOuIlRevient(
  concept: Pick<ConceptDu, "due" | "lastReview">,
  maintenant: Date,
  fuseau: string,
): string {
  const aujourdhui = jourLocal(maintenant, fuseau);

  if (estServableAujourdhui(concept, maintenant, fuseau)) return aujourdhui;

  const echeance = jourLocal(concept.due, fuseau);

  // Échéance passée ou du jour mais non servable : il a déjà servi, il revient demain.
  return echeance > aujourdhui ? echeance : jourSuivant(aujourdhui);
}

/**
 * La répartition des formats porte sur cette liste, pas sur les candidats : la
 * requête ramène trente-six heures d'avance, qui consommeraient des formats.
 */
export function conceptsDeLaJournee<T extends ConceptDu>(
  concepts: T[],
  maintenant: Date,
  fuseau: string,
  plafond: number = PLAFOND_SESSION,
): T[] {
  // `bornerLeNeuf` et non un `slice` : le neuf a une urgence infinie.
  return bornerLeNeuf(
    concepts
      .filter((concept) => estServableAujourdhui(concept, maintenant, fuseau))
      .sort(parUrgence(maintenant)),
    plafond,
  );
}

/** Zéro veut dire que la journée est faite. */
export function plafondRestant(plafond: number, faitsAujourdhui: number): number {
  return Math.max(0, Math.max(0, plafond) - Math.max(0, faitsAujourdhui));
}

export type ChargeDuJour = { aujourdhui: number; enAttente: number };

/** Servi et reporté plutôt que le total échu, qui découragerait sans rien apprendre. */
export function chargeDuJour(dus: number, plafond: number = PLAFOND_SESSION): ChargeDuJour {
  const borne = Math.max(0, plafond);

  return { aujourdhui: Math.min(dus, borne), enAttente: Math.max(0, dus - borne) };
}
