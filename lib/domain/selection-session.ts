import { alternerLesSujets } from "./alternance-des-sujets";
import { jourSuivant, localDay } from "./local-day";
import { bornerLeNeuf } from "./part-de-nouveaute";
import { parUrgence } from "./urgence-de-revision";

/**
 * Ce qui compose une session : ce qui est dû, dans quel ordre, et jusqu'où.
 *
 * Un concept est dû selon le jour civil de l'utilisateur, pas en UTC : à 00 h 30
 * à Paris, une échéance à 23 h 00 UTC la veille est déjà passée pour lui.
 *
 * La session ne se complète jamais avec des concepts non échus : être à jour est
 * un état normal.
 */

/**
 * Au-delà, la session devient une corvée qu'on abandonne. Le reste est encore
 * dû demain, trié par `parUrgence`.
 *
 * Le plafond porte sur la journée, pas sur une ouverture d'écran : sinon
 * recharger en donnerait vingt de plus. Qui veut continuer a l'entraînement.
 */
export const PLAFOND_SESSION = 20;

/**
 * Ce qu'un compte peut choisir comme plafond. Sous cinq, l'arriéré grossit
 * mécaniquement ; au-delà de cinquante, personne ne tient la session.
 */
export const PLAFOND_MIN = 5;
export const PLAFOND_MAX = 50;

/**
 * Le plafond lu depuis ce qu'on a écrit, ou `null` si ce n'en est pas un.
 * `null` plutôt qu'une exception : l'appelant est un formulaire.
 */
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
  /** Le dépôt d'origine, qui sert de sujet quand le concept n'a pas de tag. */
  inputId: string;
  /** Dernier passage sur ce concept, quel qu'en ait été le résultat. */
  lastReview: Date | null;
  /** L'intervalle que ts-fsrs avait prévu, en jours. Zéro pour un concept neuf. */
  scheduledDays: number;
};

/** Vrai si l'échéance tombe au plus tard dans la journée en cours chez l'utilisateur. */
export function estDu(due: Date, maintenant: Date, fuseau: string): boolean {
  // Au format AAAA-MM-JJ, l'ordre lexicographique est l'ordre chronologique.
  return localDay(due, fuseau) <= localDay(maintenant, fuseau);
}

/**
 * Déjà passé aujourd'hui : il ne revient pas aujourd'hui.
 *
 * ts-fsrs replanifie un concept en apprentissage à quelques minutes, donc le
 * même jour civil. Sans cette règle la session le reposerait dans la foulée, et
 * « tu es à jour » ne serait jamais atteignable.
 */
export function dejaRevuAujourdhui(
  lastReview: Date | null,
  maintenant: Date,
  fuseau: string,
): boolean {
  if (!lastReview) return false;

  return localDay(lastReview, fuseau) === localDay(maintenant, fuseau);
}

/**
 * Le prédicat unique « posable aujourd'hui ». Tout ce qui compte des concepts
 * (session, ce qui revient demain, prochaine échéance) passe par ici : deux
 * définitions divergeraient en silence.
 */
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

/**
 * Le jour civil où ce concept sera posé, que les écrans annoncent.
 *
 * Ce n'est pas son échéance : un concept qui vient d'être revu en porte une
 * dans la journée, mais ne reviendra que demain.
 */
export function jourOuIlRevient(
  concept: Pick<ConceptDu, "due" | "lastReview">,
  maintenant: Date,
  fuseau: string,
): string {
  const aujourdhui = localDay(maintenant, fuseau);

  if (estServableAujourdhui(concept, maintenant, fuseau)) return aujourdhui;

  const echeance = localDay(concept.due, fuseau);

  // Échéance passée ou du jour mais non servable : il a déjà servi, il revient demain.
  return echeance > aujourdhui ? echeance : jourSuivant(aujourdhui);
}

/**
 * La session du jour : ce qui est échu, borné, et mélangé.
 *
 * Le plafond s'applique après le tri par urgence et avant l'alternance : sinon
 * un concept solide passerait devant un fragile pour une raison d'affichage.
 *
 * `gesteDe` est facultatif parce que le geste dépend de la variante servie, que
 * les simples décomptes ne choisissent pas. Il départage l'alternance des sujets
 * sans la défaire.
 */
export function composerSession<T extends ConceptDu>(
  concepts: T[],
  maintenant: Date,
  fuseau: string,
  plafond: number = PLAFOND_SESSION,
  gesteDe?: (concept: T) => string,
): T[] {
  return alternerLesSujets(conceptsDeLaJournee(concepts, maintenant, fuseau, plafond), gesteDe);
}

/**
 * Ce que la journée servira, décidé avant de savoir sous quelle forme.
 *
 * La répartition des formats doit porter sur cette liste, pas sur les
 * candidats : la requête ramène trente-six heures d'avance, et des concepts dus
 * demain consommeraient des formats sans être servis.
 */
export function conceptsDeLaJournee<T extends ConceptDu>(
  concepts: T[],
  maintenant: Date,
  fuseau: string,
  plafond: number = PLAFOND_SESSION,
): T[] {
  /*
    `bornerLeNeuf` et non un `slice` : un concept jamais revu a une urgence
    infinie, et un gros dépôt prendrait toute la session pendant des jours.
  */
  return bornerLeNeuf(
    concepts
      .filter((concept) => estServableAujourdhui(concept, maintenant, fuseau))
      .sort(parUrgence(maintenant)),
    plafond,
  );
}

/**
 * Ce qu'il reste du plafond après ce qui a déjà été fait dans la journée. Zéro
 * veut dire que la journée est faite.
 */
export function plafondRestant(plafond: number, faitsAujourdhui: number): number {
  return Math.max(0, Math.max(0, plafond) - Math.max(0, faitsAujourdhui));
}

export type ChargeDuJour = { aujourdhui: number; enAttente: number };

/**
 * Ce que la session sert aujourd'hui, et ce qu'elle reporte : le total échu
 * seul découragerait sans rien apprendre.
 */
export function chargeDuJour(dus: number, plafond: number = PLAFOND_SESSION): ChargeDuJour {
  const borne = Math.max(0, plafond);

  return { aujourdhui: Math.min(dus, borne), enAttente: Math.max(0, dus - borne) };
}
