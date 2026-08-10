/**
 * Où en est un dépôt, du point de vue de celui qui l'a déposé.
 *
 * L'état stocké dit ce que le système fait ; celui-ci dit ce que l'utilisateur
 * attend. « En cours » ne renseigne personne : entre la lecture d'une capture
 * et l'écriture des questions, il n'attend ni la même chose ni le même délai.
 */

export type EtatDepot = "lecture" | "decoupage" | "questions" | "pret" | "echec";

export type TravailEnCours = { kind: "OCR" | "ATOMS" | "VARIANTS" };

export type AvancementDepot = {
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  /** Les travaux ni terminés ni abandonnés. */
  travaux: TravailEnCours[];
  concepts: number;
};

export function etatDuDepot(avancement: AvancementDepot): EtatDepot {
  if (avancement.status === "FAILED") return "echec";
  if (avancement.status === "READY") return "pret";

  const kinds = new Set(avancement.travaux.map((travail) => travail.kind));

  if (kinds.has("OCR")) return "lecture";
  if (kinds.has("ATOMS")) return "decoupage";
  if (kinds.has("VARIANTS")) return "questions";

  // Plus rien en attente sans être passé à READY : la clôture n'a pas encore
  // eu lieu. Les concepts sont là ou non, c'est ce qui décide.
  return avancement.concepts > 0 ? "questions" : "decoupage";
}

const LIBELLES: Record<EtatDepot, string> = {
  lecture: "Lecture de la capture",
  decoupage: "Découpage en concepts",
  questions: "Écriture des questions",
  pret: "Prêt",
  echec: "Échec",
};

export function libelleEtat(etat: EtatDepot): string {
  return LIBELLES[etat];
}

/** Un dépôt dont les concepts sont déjà lisibles, même s'il travaille encore. */
export function conceptsLisibles(etat: EtatDepot): boolean {
  return etat === "questions" || etat === "pret";
}
