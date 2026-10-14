import { SortieTronqueeError } from "@/lib/ai/errors";
import { scinderLeJobDeQuestions } from "@/lib/db/lots";
import type { GenerationJob } from "@/lib/db/types";
import { scinderLeGroupe } from "@/lib/domain/scission-de-groupe";

/**
 * Le signal qu'un job de questions n'a pas tout rendu et repart en file.
 *
 * Ni un succès ni un échec : les deux fermeraient le job, laissant des concepts
 * sans questions ou faisant réécrire ceux déjà écrits. Le job a déjà été
 * rétréci et rendu à la file ; l'erreur demande seulement à l'exécuteur de ne
 * pas le refermer.
 */
export class LotIncomplet extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LotIncomplet";
  }
}

/**
 * Ce qu'on fait d'un groupe dont la réponse a buté sur le plafond de jetons.
 *
 * Rien ne reprend un job échoué : sans cette coupe, ses concepts n'auraient
 * jamais de questions. On coupe le groupe en deux plutôt que de le rejouer, la
 * seule reprise qui demande moins que ce qui n'a pas tenu. Le job garde la
 * moitié haute et retourne en file, l'autre part dans un job neuf. Un concept
 * seul qui déborde encore ne se découpe plus : c'est le plafond qu'il faut
 * relever.
 *
 * Ne rend jamais la main : elle lève `LotIncomplet` si la coupe a eu lieu, et
 * l'erreur d'origine sinon.
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
