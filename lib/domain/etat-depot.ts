import type { EtapeDeLAttente } from "./catalogue-dattente";

/**
 * Où en est un dépôt du point de vue de celui qui l'a déposé, pas du système.
 * Trois fins sans concept à ne pas confondre : `rejete` (rien à retenir,
 * redéposer donnerait pareil), `echec` (cassé, retenter a du sens), `vide`
 * (concepts supprimés par l'utilisateur, le texte se redécoupe).
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
  /** Un concept ne redemande des questions qu'une fois par semaine : la demande patiente. */
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

  // Prêt sans concept : l'utilisateur les a supprimés.
  if (avancement.status === "READY") return avancement.concepts > 0 ? "pret" : "vide";

  const kinds = new Set(
    avancement.travaux.filter((travail) => !travail.differe).map((travail) => travail.kind),
  );

  if (kinds.has("OCR")) return "lecture";
  if (kinds.has("ATOMS")) return "decoupage";
  if (kinds.has("VARIANTS")) return "questions";

  if (avancement.travaux.some((travail) => travail.differe)) return "questions-differees";

  // Plus aucun travail mais pas encore READY : la clôture n'a pas eu lieu.
  return avancement.concepts > 0 ? "questions" : "decoupage";
}

/** Décide si l'écran se rafraîchit seul ; rien ne tourne pendant `questions-differees`. */
export function travailEnCours(etat: EtatDepot): boolean {
  return etat === "lecture" || etat === "decoupage" || etat === "questions";
}

/** L'étape d'attente à raconter (`catalogue-dattente.ts`). */
export function etapeDuTravail(etat: EtatDepot): EtapeDeLAttente | null {
  if (etat === "lecture") return "LECTURE";
  if (etat === "decoupage") return "DECOUPAGE";
  if (etat === "questions") return "ECRITURE";

  return null;
}

/** Un dépôt dont les concepts sont déjà lisibles, même s'il travaille encore. */
export function conceptsLisibles(etat: EtatDepot): boolean {
  return etat === "questions" || etat === "questions-differees" || etat === "pret";
}

/** Pas sur un rejet : relancer paierait un appel pour la même réponse. */
export function redecoupable(etat: EtatDepot): boolean {
  return etat === "vide" || etat === "echec";
}
