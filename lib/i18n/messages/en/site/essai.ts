import type { Messages } from "../../fr";

export const essai: Messages["site"]["essai"] = {
  formulaire: {
    titreHaut: "Drop",
    titreBas: "something in.",
    mecanisme:
      "Kairn breaks what you paste into concepts, turns them into questions, and asks you again just before you'd forget them.",
    exemples: "Or start from an example:",
  },
  champ: {
    intitule: "What you want to remember",
    enGrand: "Open a larger field",
    descriptionEnGrand: "The same field, larger. What you write here goes into the form.",
  },
  action: {
    envoyer: "See what comes out",
    enCours: "Breaking it down…",
    rassurance: "No account, no email.",
    reprise: "What you just saw is still yours: you get it back too when you create your account.",
  },
  fenetre: {
    titre: "What your text turned into",
    fermer: "Close",
  },
  attente: {
    titre: "Breaking down your text.",
    longue:
      "Still looking. Your concepts will show up here as soon as they arrive; there's nothing you need to do.",
    courte: "Your concepts show up right here, not behind a sign-up screen.",
    abandonTitre: "This is taking a while.",
    abandonTexte:
      "Your text isn't lost. Come back to this page in a little while: your concepts will be waiting.",
    verifier: "Check now",
  },
  resultat: {
    titre: "{nombre, plural, one {# concept.} other {# concepts.}}",
    promesse:
      "{nombre, plural, one {It will come back on its own, right when you were about to forget it.} other {Each one will come back separately, right when you were about to forget it.}}",
  },
  echantillon: {
    titre:
      "{nombre, plural, one {One question on one of them.} other {# questions on one of them.}}",
    rotation:
      "They change from one review to the next. It's the concept that has to stick, not a sentence learned by heart.",
    formats: "Question format",
    ecritureTitre: "Writing the questions.",
    ecritureTexte:
      "Four ways of asking about the same concept, each in a different format. About twenty seconds.",
    ecritureAbandonTitre: "The questions are taking a while.",
    ecritureAbandonTexte:
      "Your concepts are already here; it's the sample that's missing. It's still being written, and it will show up here the next time you stop by.",
    verifier: "Check now",
  },
  // « Fill the gap », pas « Fill in the blank » : deux par ligne sur
  // téléphone, la paire la plus longue doit tenir.
  libelleFormat: {
    MCQ: "Multiple choice",
    CLOZE: "Fill the gap",
    TRUE_FALSE: "True or false",
    SHORT_ANSWER: "Short answer",
    CODE: "Code",
    EXPLAIN: "Explain",
  },
  repris: {
    // « to keep », pas « is waiting » : plus court que « 1 concept t'attend. »,
    // sur lequel la ligne est réglée.
    titre: "{nombre, plural, one {# concept to keep.} other {# concepts to keep.}}",
    texte:
      "We pulled them out of what you just dropped in. Your email address is all it takes for us to bring them back at the right moment, and you keep these ones.",
    garder: "Keep them",
    revoir: "See them again",
  },
  garder: {
    garder: "Keep them",
    mention: "Just your email address, and you keep these ones.",
  },
  sortie: {
    redeposer: "Drop in something else",
    essaisFaits: "You've used your two tries for today.",
  },
};
