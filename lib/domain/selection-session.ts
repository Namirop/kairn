import { alternerLesSujets } from "./alternance-des-sujets";
import { jourSuivant, localDay } from "./local-day";
import { parUrgence } from "./urgence-de-revision";

/**
 * Ce qui compose une session : ce qui est dû, dans quel ordre, et jusqu'où.
 *
 * Un concept est dû dans le **jour civil de l'utilisateur**, pas en UTC. À
 * 00 h 30 à Paris, une échéance posée à 23 h 00 UTC la veille est déjà passée
 * pour lui ; en UTC elle ne l'est pas encore. C'est son calendrier qui décide,
 * puisque c'est lui qui révise.
 *
 * La session ne se complète jamais avec des concepts non échus. Être à jour est
 * un état normal, pas un vide à combler.
 */

/**
 * Au-delà, la session devient une corvée qu'on abandonne à mi-parcours. Le
 * reste n'est pas perdu : il est encore dû demain, et ce qui sera alors le plus
 * en train d'être oublié passera en tête — c'est `parUrgence` qui en décide, pas
 * l'ordre d'arrivée.
 *
 * Le plafond porte sur la **journée** et non sur une ouverture d'écran. Par
 * session, il suffisait de recharger pour en obtenir vingt de plus : la promesse
 * « vingt aujourd'hui, dix-huit en attente » était fausse, et le plafond ne
 * protégeait de rien. Qui veut continuer a l'entraînement, qui est illimité et ne
 * touche à rien de la mémoire — c'est exactement ce pour quoi il existe.
 */
export const PLAFOND_SESSION = 20;

/**
 * Ce qu'un compte peut choisir comme plafond.
 *
 * En deçà de cinq, une session ne fait plus rien avancer et l'arriéré grossit
 * mécaniquement. Au-delà de cinquante, c'est le contraire du plafond : personne
 * ne tient cinquante rappels d'affilée, et la session redevient la corvée qu'on
 * abandonne au milieu. Entre les deux, c'est une affaire de temps disponible et
 * ça ne se décide pas d'ici.
 */
export const PLAFOND_MIN = 5;
export const PLAFOND_MAX = 50;

/**
 * Le plafond lu depuis ce qu'on a écrit, ou `null` si ce n'en est pas un.
 *
 * `null` et non une exception : l'appelant est un formulaire, et il a un message
 * à afficher plutôt qu'une panne à propager.
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
  // Deux dates au format AAAA-MM-JJ : l'ordre lexicographique est l'ordre
  // chronologique, sans repasser par un fuseau ni un décalage.
  return localDay(due, fuseau) <= localDay(maintenant, fuseau);
}

/**
 * Déjà passé aujourd'hui : il ne revient pas aujourd'hui.
 *
 * ts-fsrs replanifie un concept encore en apprentissage à quelques minutes, si
 * bien que sa prochaine échéance tombe le même jour civil. Sans cette règle la
 * session le reposerait dans la foulée, et « tu es à jour » ne serait jamais
 * atteignable — alors que c'est l'état normal du produit, pas un vide.
 *
 * La Session est l'unité d'usage quotidien : ce qui a été vu aujourd'hui compte
 * comme vu, le reste est reporté au lendemain.
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
 * Le prédicat unique : ce concept est-il posable aujourd'hui ?
 *
 * Tout ce qui compte des concepts — la session, ce qui revient demain, la
 * prochaine échéance annoncée — passe par ici. Deux définitions de « est dû »
 * finissent toujours par diverger, et elles divergent en silence.
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
 * Le jour civil où ce concept sera posé.
 *
 * Ce n'est pas son échéance : celui qui vient d'être revu en porte une encore
 * dans la journée — ts-fsrs replanifie court en apprentissage — et ne reviendra
 * pourtant que demain. C'est ce jour-là qui intéresse l'utilisateur, et c'est
 * lui qu'annoncent les écrans.
 */
export function jourOuIlRevient(
  concept: Pick<ConceptDu, "due" | "lastReview">,
  maintenant: Date,
  fuseau: string,
): string {
  const aujourdhui = localDay(maintenant, fuseau);

  if (estServableAujourdhui(concept, maintenant, fuseau)) return aujourdhui;

  const echeance = localDay(concept.due, fuseau);

  // Son échéance si elle est devant. Sinon elle est derrière ou aujourd'hui, et
  // s'il n'est pas servable c'est qu'il a déjà servi : il revient demain.
  return echeance > aujourdhui ? echeance : jourSuivant(aujourdhui);
}

/**
 * La session du jour : ce qui est échu, borné, et mélangé.
 *
 * Le plafond s'applique **avant** l'alternance et après le tri par urgence : on
 * garde d'abord ce qui est le plus en train d'être oublié, puis on ordonne ce
 * qu'on a gardé. L'inverse laisserait un concept solide passer devant un
 * concept fragile pour une raison d'affichage.
 *
 * `gesteDe` est facultatif parce que le geste dépend de la variante servie, et que
 * tout ce qui compte les concepts dus n'en choisit pas. Quand il est donné, il
 * départage l'alternance des sujets sans jamais la défaire.
 */
export function composerSession<T extends ConceptDu>(
  concepts: T[],
  maintenant: Date,
  fuseau: string,
  plafond: number = PLAFOND_SESSION,
  gesteDe?: (concept: T) => string,
): T[] {
  const dus = concepts
    .filter((concept) => estServableAujourdhui(concept, maintenant, fuseau))
    .sort(parUrgence(maintenant));

  return alternerLesSujets(dus.slice(0, Math.max(0, plafond)), gesteDe);
}

/**
 * Ce que la session sert aujourd'hui, et ce qu'elle reporte.
 *
 * Le tableau de bord annonçait le total échu. Trente-huit est un chiffre qui
 * décourage sans rien apprendre : la session n'en servira que vingt, et les
 * dix-huit autres reviennent demain sans que personne n'ait rien perdu. Voir le
 * total est utile ; le voir sans le plafond ne l'est pas.
 */
/**
 * Ce qu'il reste du plafond après ce qui a déjà été fait dans la journée.
 *
 * Zéro est un état normal et une bonne nouvelle : la journée est faite. Ce qui
 * reste dû n'est pas perdu, il attend demain.
 */
export function plafondRestant(plafond: number, faitsAujourdhui: number): number {
  return Math.max(0, Math.max(0, plafond) - Math.max(0, faitsAujourdhui));
}

export type ChargeDuJour = { aujourdhui: number; enAttente: number };

export function chargeDuJour(dus: number, plafond: number = PLAFOND_SESSION): ChargeDuJour {
  const borne = Math.max(0, plafond);

  return { aujourdhui: Math.min(dus, borne), enAttente: Math.max(0, dus - borne) };
}
