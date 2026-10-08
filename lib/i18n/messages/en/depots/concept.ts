import type { Messages } from "../../fr";

export const concept: Messages["depots"]["concept"] = {
  questionsEcrites: "{nombre, plural, =1 {# question written} other {# questions written}}",
  reecrire: "Rewrite the concept",
  avertissementReecriture:
    "Questions written on the old wording will be replaced, and scheduling starts over.",
  enregistrer: "Save",
  annuler: "Cancel",
  aVerifier: "To check",
  sortiDuCycle: "Out of rotation",
  douteux:
    "This passage was pulled out as you dropped it in, but it looks factually doubtful. Nobody has checked it — no question was written on it, so as not to lock in a mistake.",
  declareSu: "You marked it as known. It comes back in three months to check.",
  remettreEnRevision: "Put back in review",
  supprimer: "Delete",
  supprimerCeConcept: "Delete this concept",
  consequence: "Its questions and your answers on it go with it. This can't be undone.",
  garderTelQuel: "Keep it as is",
  modifier: "Edit",
};

export const facettes: Messages["depots"]["facettes"] = {
  RECOGNITION: "Recognize",
  MECHANISM: "Explain",
  BOUNDARY: "Pin down",
  APPLICATION: "Apply",
};

export const formats: Messages["depots"]["formats"] = {
  MCQ: "Multiple choice",
  CLOZE: "Fill in the blank",
  TRUE_FALSE: "True or false",
  SHORT_ANSWER: "Short answer",
  CODE: "Code",
  EXPLAIN: "Explanation",
};
