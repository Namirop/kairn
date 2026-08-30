import type { GenerationJob, GenerationKind } from "@/lib/db/types";
import { decouperEnConcepts } from "./decoupage";
import { lireImage } from "./lecture-image";
import { redigerLesQuestions } from "./redaction-questions";

/**
 * Les traitements, un par nature de job.
 *
 * Les trois passent par l'exécuteur, et il n'y a plus qu'eux. Les questions
 * partaient en envoi groupé tant qu'elles ne servaient qu'à la première
 * révision ; l'entraînement libre les a rendues utiles à l'instant du dépôt,
 * puis le passage à Luna a retiré au demi-tarif du lot sa raison d'être.
 */
export type JobHandler = (job: GenerationJob) => Promise<void>;

export const JOB_HANDLERS: Record<GenerationKind, JobHandler> = {
  OCR: lireImage,
  ATOMS: decouperEnConcepts,
  VARIANTS: redigerLesQuestions,
};
