import type { Messages } from "../../fr";

export const liste: Messages["depots"]["liste"] = {
  metaTitre: "Drops",
  titre: "What you dropped in",
  chapeau: "The original text is never rewritten. It stays exactly as you left it.",
  deposer: "Drop in",
};

export const depot: Messages["depots"]["depot"] = {
  metaTitre: "Drop",
  retour: "Back to drops",
  titre: "{nombre, plural, one {# concept} other {# concepts}}",
  depose: "Dropped in {quand}",
  ceQueTuAsDepose: "What you dropped in",
  consigneEcartait:
    "Your instruction left out part of this drop: it isn't shown here. The original text is still kept exactly as you left it.",
  captureTronquee:
    "The screenshot held more text than a drop takes. Reading stops at {maximum, number} characters.",
  taConsigne: "Your instruction: “{consigne}”",
  ceQuOnEnATire: "What came out of it",
  conceptsTronques:
    "This text held more than {plafond} concepts. We followed it in order and stopped at the last concept in this list — drop in the end of the text to get the rest.",
  lent: "This is taking longer than usual. The page will update on its own.",
  aVerifier: {
    badge: "To check",
    constat:
      "{nombre, plural, one {# concept looks doubtful. Until you've decided on it, it stays without questions.} other {# concepts look doubtful. Until you've decided on them, they stay without questions.}}",
    voir: "{nombre, plural, one {See it} other {See the first one}}",
  },
  serie: {
    aujourdhui: "Today's session has {nombre, plural, one {# concept} other {# concepts}}.",
    commencer: "Start reviewing",
    journeeFaite:
      "Your day is done: {nombre, plural, one {# concept is} other {# concepts are}} waiting for tomorrow, this one included.",
  },
  gestes: {
    supprimer: "Delete this drop",
    toutSupprimer:
      "{concepts, plural, =0 {Delete everything} =1 {Delete everything, concept included} other {Delete everything, concepts included}}",
    consequence:
      "The text, the concepts, their questions and your answers go with it. This can't be undone.",
    unInstant: "One moment",
    redecouper: "Split again",
    explication:
      "Splitting again runs a new extraction on the same text, and uses up one of today's drops.",
  },
  vide: {
    rejete: {
      constat: "Nothing to keep in this drop.",
      contexte: "This text doesn't hold a concept to review.",
    },
    echec: {
      constat: "Finding concepts stopped partway.",
      contexte: "Nothing was written. You can run it again on the same text.",
    },
    vide: {
      constat: "You deleted the concepts from this drop.",
      contexte: "The text is still here. You can split it again, or delete the drop.",
    },
    lecture: {
      constat: "The screenshot is being read.",
      contexte: "Finding concepts follows as soon as the text is pulled out.",
    },
    attente: {
      constat: "No concepts yet.",
      contexte: "Concepts show up here as soon as they've been found.",
    },
  },
};
