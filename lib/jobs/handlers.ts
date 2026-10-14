import type { GenerationJob, GenerationKind } from "@/lib/db/types";
import { decouperEnConcepts } from "./decoupage";
import { lireImage } from "./lecture-image";
import { redigerLesQuestions } from "./redaction-questions";

/** Les traitements, un par nature de job. */
export type JobHandler = (job: GenerationJob) => Promise<void>;

export const JOB_HANDLERS: Record<GenerationKind, JobHandler> = {
  OCR: lireImage,
  ATOMS: decouperEnConcepts,
  VARIANTS: redigerLesQuestions,
};
