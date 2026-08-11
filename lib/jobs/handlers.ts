import type { GenerationJob, GenerationKind } from "@/lib/db/types";
import { decouperEnConcepts } from "./decoupage";
import { lireImage } from "./lecture-image";
import { redigerLesQuestions } from "./redaction-questions";

/**
 * Les traitements, un par nature de job.
 *
 * Les trois passent par l'exécuteur. Les questions y sont revenues : elles
 * partaient en envoi groupé tant qu'elles ne servaient qu'à la première
 * révision, mais l'entraînement libre les rend utiles à l'instant du dépôt.
 *
 * Le chemin groupé reste ouvert par ailleurs — c'est `soumettreLotsEnAttente()`
 * qui ramasse les jobs de questions restés en attente, et lui seul appelle
 * `releverLots()`. Un job relevé d'un lot ne repasse jamais par ici : il est
 * terminé par la relève.
 */
export type JobHandler = (job: GenerationJob) => Promise<void>;

export const JOB_HANDLERS: Record<GenerationKind, JobHandler> = {
  OCR: lireImage,
  ATOMS: decouperEnConcepts,
  VARIANTS: redigerLesQuestions,
};
