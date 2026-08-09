import type { GenerationJob, GenerationKind } from "@/lib/db/types";

/**
 * Les traitements, un par nature de job.
 *
 * En phase 0 ce sont des coquilles vides : c'est la mécanique de file qui doit
 * fonctionner, pas le contenu. Les vrais traitements arrivent avec l'ingestion
 * (OCR, ATOMS) puis la génération de questions (VARIANTS), et passeront tous
 * par `callAI()` en lui donnant l'identifiant du job pour la traçabilité.
 */
export type JobHandler = (job: GenerationJob) => Promise<void>;

const noop: JobHandler = async () => {};

export const JOB_HANDLERS: Record<GenerationKind, JobHandler> = {
  OCR: noop,
  ATOMS: noop,
  VARIANTS: noop,
};
