import { State, type Card } from "ts-fsrs";
import { FsrsState } from "@/lib/db/generated/enums";
import type { AtomModel } from "@/lib/db/generated/models";

/**
 * Traduction entre la ligne `Atom` et la carte de ts-fsrs, dans les deux sens.
 * Seul endroit qui connaît la correspondance entre `FsrsState` et `State`.
 */

const TO_LIBRARY: Record<FsrsState, State> = {
  NEW: State.New,
  LEARNING: State.Learning,
  REVIEW: State.Review,
  RELEARNING: State.Relearning,
};

const FROM_LIBRARY: Record<State, FsrsState> = {
  [State.New]: FsrsState.NEW,
  [State.Learning]: FsrsState.LEARNING,
  [State.Review]: FsrsState.REVIEW,
  [State.Relearning]: FsrsState.RELEARNING,
};

/** Les champs d'un `Atom` que ts-fsrs écrit. Rien d'autre ne doit les toucher. */
export type AtomCardFields = Pick<
  AtomModel,
  | "due"
  | "stability"
  | "difficulty"
  | "elapsedDays"
  | "scheduledDays"
  | "learningSteps"
  | "reps"
  | "lapses"
  | "fsrsState"
  | "lastReview"
>;

export function toCard(atom: AtomCardFields): Card {
  return {
    due: atom.due,
    stability: atom.stability,
    difficulty: atom.difficulty,
    elapsed_days: atom.elapsedDays,
    scheduled_days: atom.scheduledDays,
    learning_steps: atom.learningSteps,
    reps: atom.reps,
    lapses: atom.lapses,
    state: TO_LIBRARY[atom.fsrsState],
    last_review: atom.lastReview ?? undefined,
  };
}

export function fromCard(card: Card): AtomCardFields {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    fsrsState: FROM_LIBRARY[card.state],
    lastReview: card.last_review ?? null,
  };
}
