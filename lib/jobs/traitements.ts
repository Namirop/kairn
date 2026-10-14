import type { GenerationJob, GenerationKind } from "@/lib/db/types";
import { decouperEnConcepts } from "./decoupage";
import { lireImage } from "./lecture-image";
import { redigerLesQuestions } from "./redaction-questions";

/** Les traitements, un par nature de job. */
export type TraitementDeJob = (job: GenerationJob) => Promise<void>;

export const TRAITEMENTS_PAR_NATURE: Record<GenerationKind, TraitementDeJob> = {
  OCR: lireImage,
  ATOMS: decouperEnConcepts,
  VARIANTS: redigerLesQuestions,
};
