/**
 * Où en est un dépôt, du point de vue de celui qui l'a déposé.
 *
 * L'état stocké dit ce que le système fait ; celui-ci dit ce que l'utilisateur
 * attend. « En cours » ne renseigne personne : entre la lecture d'une capture
 * et l'écriture des questions, il n'attend ni la même chose ni le même délai.
 *
 * Trois fins sans concept, et il a longtemps fallu les vivre pour comprendre
 * qu'elles n'avaient rien à voir :
 *
 * - `rejete` — la chaîne a tourné et a conclu qu'il n'y avait rien à retenir.
 *   Le motif le dit précisément. Redéposer le même texte donnera le même
 *   résultat ; il n'y a qu'à jeter.
 * - `echec` — quelque chose s'est cassé. Retenter a du sens.
 * - `vide` — il y a eu des concepts, l'utilisateur les a tous supprimés. Le
 *   texte, lui, est toujours là, et on peut le redécouper.
 *
 * Les confondre était le vrai bug : un dépôt vidé annonçait « découpage en
 * cours » pour l'éternité, et un dépôt sans matière annonçait « échec » comme
 * si le produit était en panne.
 */

export type EtatDepot =
  | "lecture"
  | "decoupage"
  | "questions"
  | "questions-differees"
  | "pret"
  | "vide"
  | "rejete"
  | "echec";

export type TravailEnCours = {
  kind: "OCR" | "ATOMS" | "VARIANTS";
  /**
   * Le travail est écrit mais attend sa date. Un concept ne redemande des
   * questions qu'une fois par semaine ; quand la demande arrive trop tôt, elle
   * patiente au lieu d'être jetée. Dire « écriture en cours » pendant six jours
   * serait faux, et taire l'attente le serait aussi.
   */
  differe?: boolean;
};

export type AvancementDepot = {
  status: "PENDING" | "PROCESSING" | "READY" | "REJECTED" | "FAILED";
  /** Les travaux ni terminés ni abandonnés. */
  travaux: TravailEnCours[];
  concepts: number;
};

export function etatDuDepot(avancement: AvancementDepot): EtatDepot {
  if (avancement.status === "REJECTED") return "rejete";
  if (avancement.status === "FAILED") return "echec";

  // Un dépôt clos sans concept en a forcément eu : sans quoi il serait rejeté
  // ou en échec, pas prêt. C'est donc que l'utilisateur les a supprimés.
  if (avancement.status === "READY") return avancement.concepts > 0 ? "pret" : "vide";

  const kinds = new Set(
    avancement.travaux.filter((travail) => !travail.differe).map((travail) => travail.kind),
  );

  if (kinds.has("OCR")) return "lecture";
  if (kinds.has("ATOMS")) return "decoupage";
  if (kinds.has("VARIANTS")) return "questions";

  // Il ne reste que des travaux qui attendent leur date. Le dépôt n'est pas en
  // panne et il n'est pas fini : il a rendez-vous.
  if (avancement.travaux.some((travail) => travail.differe)) return "questions-differees";

  // Plus rien en attente sans être passé à READY : la clôture n'a pas encore
  // eu lieu. Les concepts sont là ou non, c'est ce qui décide.
  return avancement.concepts > 0 ? "questions" : "decoupage";
}

const LIBELLES: Record<EtatDepot, string> = {
  lecture: "Lecture de la capture",
  decoupage: "Découpage en concepts",
  questions: "Écriture des questions",
  "questions-differees": "Questions en attente",
  pret: "Prêt",
  vide: "Vidé",
  rejete: "Rien à retenir",
  echec: "Échec",
};

export function libelleEtat(etat: EtatDepot): string {
  return LIBELLES[etat];
}

/** Un dépôt dont les concepts sont déjà lisibles, même s'il travaille encore. */
export function conceptsLisibles(etat: EtatDepot): boolean {
  return etat === "questions" || etat === "questions-differees" || etat === "pret";
}

/**
 * Peut-on relancer une extraction sur ce texte ?
 *
 * Sur un dépôt vidé, c'est le geste attendu : le découpage ne convenait pas, on
 * a tout supprimé, on retente. Sur un échec aussi — c'est même la seule raison
 * de distinguer l'échec du rejet.
 *
 * Sur un rejet, non. La chaîne a déjà lu ce texte et a dit ce qui manquait ;
 * relancer paierait un appel pour obtenir la même phrase. Il ne reste qu'à
 * supprimer.
 */
export function redecoupable(etat: EtatDepot): boolean {
  return etat === "vide" || etat === "echec";
}
