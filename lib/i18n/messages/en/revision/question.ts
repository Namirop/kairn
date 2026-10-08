import type { Messages } from "../../fr";

export const question: Messages["revision"]["question"] = {
  dernierPassage:
    "{jours, plural, =0 {You saw it today.} =1 {You saw it yesterday.} other {You saw it # days ago.}}",
  laReponse: "The answer",
  pourquoi: "Why",
  terminer: "Finish",
  continuer: "Continue",
  tempsDeLire: "Time to read it.",
  verdict: {
    juste: "Correct.",
    faux: "Incorrect.",
    bonneOption: "Correct answer.",
    choixFaux: "Your choice, incorrect.",
  },
  jeterLaPierre: "I give up",
  nonRetrouve: "Marked as not recalled.",
  ouverte: {
    consigne: "Put your answer into words first, even in your head.",
    voir: "Show the answer",
    raison: "The effort of recalling it is what makes it stick.",
  },
  cloze: {
    termeAttendu: "That's the expected term.",
    aide: "Recalled with a nudge: the concept comes back a little sooner.",
    tuAsEcrit: "You wrote <terme>{saisie}</terme>.",
    jeLAvais: "I had it",
    jeNeLAvaisPas: "I didn't have it",
    consigne: "Fill in the missing term",
    verifier: "Check",
    jeSeche: "I'm stuck",
    pistes: "One of these terms",
    rappelAide: "Counted as an assisted recall: the concept comes back a little sooner.",
  },
  notation: {
    question: "How close were you?",
    AGAIN: "I didn't have it",
    HARD: "Almost",
    GOOD: "I had it",
    EASY: "Without hesitation",
    oublie: "Forgotten",
    immediat: "Instant",
  },
  maitrise: {
    geste: "I know this",
    precision: "The concept comes back in three months to check, and you can undo this.",
    sorti: "<fort>Out of the cycle</fort>, it will come back in three months.",
    annuler: "Undo",
  },
  erreurPassage: "This answer couldn't be saved. Try again.",
};
