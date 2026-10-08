import type { Messages } from "../../fr";

export const accueil: Messages["site"]["accueil"] = {
  hero: {
    // Mesurées sur la Bricolage du dépôt : 6,8 et 7,0 corps, contre 7,7 pour
    // « Tu lis beaucoup. » — le titre tient sur une ligne avec de la marge.
    constat: "You read a lot.",
    retournement: "Most of it fades.",
    aujourdhui: "Today",
    essayer: "Try without an account",
  },
  entete: {
    aujourdhui: "Today",
    seConnecter: "Sign in",
  },
  pied: {
    devise: "Kairn — a cairn marks a trail, one stone at a time.",
    tarifs: "Pricing",
    mentionsLegales: "Legal notice",
    confidentialite: "Privacy",
  },
  sentier: {
    titreHaut: "Three moves,",
    titreBas: "and that's it.",
    deposer: {
      titre: "You drop it in",
      texte:
        "Nothing to format, nothing to split up, no cards to make: you paste, and you're done. Even a photo of a page from a book.",
    },
    decouper: {
      titre: "Kairn breaks it down",
      texte:
        "What you drop in becomes single concepts, each with three or four ways of being asked: a term to find in a sentence, a choice to make, an explanation to give. The wording changes so you remember the idea, not the sentence.",
    },
    revenir: {
      titre: "It comes back",
      texte:
        "Each concept comes back right when you're about to forget it. The better you know it, the further apart it comes. One more stone on the cairn once it's yours.",
    },
  },
  pasCeci: {
    titreHaut: "What it",
    titreBas: "isn't.",
    negations:
      "It isn't a flashcard app where you write the cards yourself: what wears you down isn't reviewing, it's making the cards. It isn't a note-taking tool — you already have one, and that's not where knowledge sticks. It isn't an assistant to talk to.",
    affirmation:
      "It does one thing: what you've read comes back at the right moment, until it's yours.",
    aujourdhui: "Today",
    creerCompte: "Create my account",
  },
};
