import type { Messages } from "../../fr";

export const signalement: Messages["revision"]["signalement"] = {
  declencheur: "Something's wrong with this question",
  titre: "What's wrong?",
  description: "You won't be asked it again. It gets read, then fixed at the source.",
  motifs: {
    INCOMPREHENSIBLE: {
      libelle: "I don't understand the question",
      aide: "Badly worded, ambiguous, or a piece is missing.",
    },
    FAUSSE: {
      libelle: "The expected answer is wrong",
      aide: "What it states isn't accurate.",
    },
    HORS_SUJET: {
      libelle: "Unrelated to what I dropped in",
      aide: "It's about something other than my text.",
    },
    TROP_FACILE: {
      libelle: "Too easy to measure anything",
      aide: "The answer is in the question.",
    },
  },
  preciser: "Add details, if you like",
  annuler: "Cancel",
  envoi: "Sending…",
  envoyer: "Send",
  merci: "Reported. This question won't come back.",
};
