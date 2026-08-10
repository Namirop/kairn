import type { GenerationJob, GenerationKind } from "@/lib/db/types";
import { decouperEnConcepts } from "./decoupage";
import { lireImage } from "./lecture-image";

/**
 * Les traitements, un par nature de job.
 *
 * Deux passent par l'exécuteur : la lecture d'une capture et le découpage en
 * concepts. Le troisième non — les questions partent en envoi groupé, sont
 * soumises par `soumettreLotsEnAttente()` et terminées par `releverLots()`.
 * L'exécuteur ne doit jamais les voir : il les marquerait terminées alors que
 * la réponse est encore chez le fournisseur.
 */
export type JobHandler = (job: GenerationJob) => Promise<void>;

const horsExecuteur: JobHandler = async (job) => {
  throw new Error(
    `Le job ${job.id} écrit des questions : il passe par la soumission groupée, pas par l'exécuteur.`,
  );
};

export const JOB_HANDLERS: Record<GenerationKind, JobHandler> = {
  OCR: lireImage,
  ATOMS: decouperEnConcepts,
  VARIANTS: horsExecuteur,
};
