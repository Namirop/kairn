import type { Messages } from "../../fr";

export const tarifs: Messages["site"]["tarifs"] = {
  meta: {
    titre: "What it costs",
    description:
      "Fifty concepts a month, free. What the free plan includes, and how the monthly count works.",
  },
  titre: "What it costs.",
  chapeau:
    "A concept is one idea Kairn has pulled out of what you drop in, and that it brings back to you at the right moment. You keep {plafond} a month without paying.",
  offres: {
    conceptsParMois: "concepts a month",
    gratuit: {
      nom: "Free plan",
      prix: "Free",
      cadence: "forever",
      raison: "Enough to find out whether it sticks.",
    },
    // Jamais affiché en anglais : Premium n'y est pas vendu. Traduit quand même,
    // pour le jour où il le sera.
    complet: {
      nom: "Premium",
      prix: "{prix} €",
      cadence: "a month",
      second: "or {annuel} € a year, two months free",
      raison: "Enough to feed a whole field — documentation, a course, ongoing reading.",
    },
    indisponible: {
      nom: "Premium",
      titre: "Premium isn't available in English yet.",
      texte:
        "It raises the limit to {concepts} new concepts a month. Everything else is already in the free plan.",
    },
  },
  precisions: {
    titre: "What the plan doesn't change.",
    identique: {
      titre: "Everything else is the same",
      texte:
        "Reviews, practice, question formats, the cairn: none of it depends on your plan. The only number that changes is how many concepts you can keep in a month.",
    },
    mois: {
      titre: "Your month starts when you sign up",
      texte:
        "Not on the 1st. If you sign up on the 12th, your counter resets on the 12th. What you don't use doesn't carry over to the next month.",
    },
    arreter: {
      titre: "Stopping takes nothing away",
      texte:
        "Your concepts stay, your reviews go on. You simply go back to {plafond} new concepts a month. Nothing is ever deleted.",
    },
    quand: {
      titre: "You can stop whenever you want",
      texte:
        "The subscription runs until the end of the period already paid, then stops. There's no commitment, and nobody to ask.",
    },
  },
  geste: {
    choisir: "Choose my plan",
    aujourdhui: "Today",
    commencer: "Start for free",
    sansCarte: "No card, no commitment.",
  },
};
