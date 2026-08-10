import { jourSuivant, localDay } from "./local-day";

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
 * reste n'est pas perdu : il est encore dû demain, et passera en tête puisque
 * l'échéance la plus dépassée sort la première.
 */
export const PLAFOND_SESSION = 20;

export type ConceptDu = {
  id: string;
  due: Date;
  tags: string[];
  /** Le dépôt d'origine, qui sert de sujet quand le concept n'a pas de tag. */
  inputId: string;
  /** Dernier passage sur ce concept, quel qu'en ait été le résultat. */
  lastReview: Date | null;
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

/** Ce qui définit un sujet pour l'alternance : le premier tag, sinon le dépôt. */
function sujet(concept: ConceptDu): string {
  return concept.tags[0] ?? concept.inputId;
}

/**
 * Alterne les domaines au lieu de les grouper.
 *
 * Réviser par blocs est plus confortable sur le moment et retient moins bien.
 * On sert donc à chaque tour le sujet le plus fourni parmi ceux qui ne viennent
 * pas d'être servis : sans cette préférence au plus fourni, le sujet majoritaire
 * finirait la session d'un bloc, ce qu'on cherchait justement à éviter.
 *
 * Deux fois la même entrée rend deux fois la même sortie : rien ici n'est tiré
 * au hasard.
 */
export function alternerLesSujets<T extends ConceptDu>(concepts: T[]): T[] {
  const files = new Map<string, T[]>();

  for (const concept of concepts) {
    const cle = sujet(concept);
    const file = files.get(cle);

    if (file) file.push(concept);
    else files.set(cle, [concept]);
  }

  const ordonnes: T[] = [];
  let precedent: string | null = null;

  while (ordonnes.length < concepts.length) {
    const restants = [...files.entries()].filter(([, file]) => file.length > 0);
    const autres = restants.filter(([cle]) => cle !== precedent);
    // Répéter un sujet vaut mieux que tronquer la session : quand il ne reste
    // que lui, il repasse.
    const tirage = autres.length > 0 ? autres : restants;
    const choisi = tirage.reduce((a, b) => (b[1].length > a[1].length ? b : a));
    const suivant = choisi[1].shift();

    if (!suivant) break;

    ordonnes.push(suivant);
    precedent = choisi[0];
  }

  return ordonnes;
}

/**
 * La session du jour : ce qui est échu, borné, et mélangé.
 *
 * Le plafond s'applique **avant** l'alternance et après le tri par échéance :
 * on garde d'abord ce qui attend depuis le plus longtemps, puis on ordonne ce
 * qu'on a gardé. L'inverse laisserait passer devant un concept échu ce matin
 * pendant qu'un autre attend depuis trois jours.
 */
export function composerSession<T extends ConceptDu>(
  concepts: T[],
  maintenant: Date,
  fuseau: string,
  plafond: number = PLAFOND_SESSION,
): T[] {
  const dus = concepts
    .filter((concept) => estServableAujourdhui(concept, maintenant, fuseau))
    // L'identifiant départage : sans lui, deux échéances égales pourraient
    // sortir dans un ordre différent d'un appel à l'autre.
    .sort((a, b) => a.due.getTime() - b.due.getTime() || a.id.localeCompare(b.id));

  return alternerLesSujets(dus.slice(0, Math.max(0, plafond)));
}
