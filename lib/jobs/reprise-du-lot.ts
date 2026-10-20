import { SortieTronqueeError } from "@/lib/ai/errors";
import { scinderLeJobDeQuestions } from "@/lib/db/lots";
import type { GenerationJob } from "@/lib/db/types";
import { scinderLeGroupe } from "@/lib/domain/scission-de-groupe";

/**
 * Le job, déjà rétréci et rendu à la file, ne doit pas être refermé : succès ou
 * échec laisseraient des concepts sans questions ou en feraient réécrire.
 */
export class LotIncomplet extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LotIncomplet";
  }
}

/**
 * Rien ne reprend un job échoué : sans cette coupe, ses concepts n'auraient
 * jamais de questions. Couper en deux est la seule reprise qui demande moins
 * que ce qui n'a pas tenu ; un concept seul qui déborde, c'est le plafond à
 * relever. Lève `LotIncomplet` si la coupe a eu lieu, l'erreur d'origine sinon.
 */
export async function scinderApresTroncature(
  job: GenerationJob,
  erreur: SortieTronqueeError,
): Promise<never> {
  const moities = scinderLeGroupe(job.atomIds);

  if (!moities) throw erreur;

  const motif = `${erreur.message} Le groupe repart coupé en deux.`;

  if (!(await scinderLeJobDeQuestions(job, moities.garde, moities.reporte, motif))) {
    throw erreur;
  }

  throw new LotIncomplet(motif);
}
