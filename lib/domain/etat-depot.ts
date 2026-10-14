import type { EtapeDeLAttente } from "./catalogue-dattente";

/**
 * Où en est un dépôt, du point de vue de celui qui l'a déposé.
 *
 * L'état stocké dit ce que le système fait ; celui-ci dit ce que l'utilisateur
 * attend, qui n'est ni la même chose ni le même délai d'une étape à l'autre.
 *
 * Trois fins sans concept, à ne pas confondre :
 *
 * - `rejete` : la chaîne a conclu qu'il n'y avait rien à retenir. Redéposer
 *   donnerait le même résultat.
 * - `echec` : quelque chose s'est cassé. Retenter a du sens.
 * - `vide` : l'utilisateur a supprimé tous les concepts. Le texte reste, on
 *   peut le redécouper.
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
   * Le travail attend sa date : un concept ne redemande des questions qu'une
   * fois par semaine, et une demande trop tôt patiente au lieu d'être jetée.
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

  // Prêt sans concept : sinon il serait rejeté ou en échec, donc l'utilisateur
  // les a supprimés.
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

/**
 * Un dépôt dont la chaîne tourne en ce moment : décide si l'écran se
 * rafraîchit seul. `questions-differees` n'en est pas, rien ne tourne pendant
 * l'attente de sa date.
 */
export function travailEnCours(etat: EtatDepot): boolean {
  return etat === "lecture" || etat === "decoupage" || etat === "questions";
}

/**
 * L'étape d'attente à raconter pendant que ce dépôt travaille, ou `null`
 * (voir `catalogue-dattente.ts`).
 */
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

/**
 * Peut-on relancer une extraction sur ce texte ? Oui sur un dépôt vidé ou en
 * échec. Pas sur un rejet : relancer paierait un appel pour la même réponse.
 */
export function redecoupable(etat: EtatDepot): boolean {
  return etat === "vide" || etat === "echec";
}
