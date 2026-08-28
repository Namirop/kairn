import { AITruncatedOutputError } from "@/lib/ai/errors";
import { scinderLeJobDeQuestions } from "@/lib/db/lots";
import type { GenerationJob } from "@/lib/db/types";
import { scinderLeGroupe } from "@/lib/domain/scission-de-groupe";

/**
 * Le signal qu'un job de questions n'a pas tout rendu et repart en file.
 *
 * Ce n'est ni un succès ni un échec, et c'est pour ça qu'il lui faut son propre
 * mot. L'exécuteur ne connaît que deux fins — terminé, ou en échec — et les deux
 * ferment le job : la première laissait les concepts sans questions derrière
 * elle, la seconde condamnait ceux qui étaient déjà écrits à être réécrits.
 *
 * Le job a déjà été rétréci et rendu à la file quand cette erreur est levée. Ce
 * qu'elle demande à l'exécuteur, c'est de **ne pas le refermer** — rien d'autre.
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
 * **C'est la cause réelle du dépôt du 28/08 qui a rendu trois concepts sur
 * six.** L'appel portait trois concepts, la sortie a atteint `AI_MAX_TOKENS`
 * pile, le repli n'a pas mieux fait, et le job s'est refermé en échec : rien ne
 * reprend un job échoué, donc ces concepts-là n'auraient plus jamais eu de
 * questions. La reprise des lots partiels, elle, ne les voyait pas — il n'y
 * avait aucun lot du tout à ranger.
 *
 * On coupe donc le groupe en deux au lieu de le rejouer : c'est la seule
 * reprise qui demande moins que ce qui vient de ne pas tenir. Le job garde la
 * moitié haute et retourne en file, l'autre moitié part dans un job neuf. Un
 * groupe de trois qui déborde trois fois de suite finit en trois appels d'un
 * concept, et si l'un d'eux déborde encore, c'est le plafond qu'il faut relever
 * — aucun découpage ne sauvera un concept dont les quatre questions ne tiennent
 * pas dans la sortie.
 *
 * Ne rend jamais la main : elle lève `LotIncomplet` si la coupe a eu lieu, et
 * l'erreur d'origine sinon.
 */
export async function scinderApresTroncature(
  job: GenerationJob,
  erreur: AITruncatedOutputError,
): Promise<never> {
  const moities = scinderLeGroupe(job.atomIds);

  if (!moities) throw erreur;

  const motif = `${erreur.message} Le groupe repart coupé en deux.`;

  if (!(await scinderLeJobDeQuestions(job, moities.garde, moities.reporte, motif))) {
    throw erreur;
  }

  throw new LotIncomplet(motif);
}
