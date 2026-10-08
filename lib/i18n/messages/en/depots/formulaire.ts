import type { Messages } from "../../fr";

export const formulaire: Messages["depots"]["formulaire"] = {
  metaTitre: "Drop in",
  titre: "Drop in what you want to remember",
  chapeau:
    "Finding concepts starts on its own. Your concepts show up in the list, nothing to launch.",
  premierDepot: "Drop in the first thing you want to remember. Anything will do.",
  etiquetteTexte: "What you want to remember",
  deposer: "Drop it in",
  depotEnCours: "Dropping in…",
  lectureDeLaCapture: "Reading the screenshot…",
  partageManque: "The share didn't make it here. Paste the text, or share it again.",
  lienSansMatiere:
    "A link isn't something to remember. Go back to the conversation, select the passage, and share it again.",
  restants:
    "You have {restants} {restants, plural, =1 {concept} other {concepts}} left to remember this month.",
  compteur: "{longueur, number} / {maximum, number}",
  pieceJointe: {
    joindre: "Attach a screenshot",
    joindreCourt: "Image",
    changer: "Change the screenshot",
    changerCourt: "Change",
    retirer: "Remove the screenshot",
  },
  consigne: {
    ajouter: "Add an instruction",
    ajouterCourt: "Instruction",
    etiquette: "Your instruction",
    retirer: "Remove",
    exemple: "Leave out the part about pricing",
    aide: "What to leave aside in this drop. It shapes how concepts are found, it doesn't add to what you remember.",
  },
  plafond: {
    concepts: "You've reached this month's limit, around {limite} concepts.",
    depots: "You've reached this month's limit, {limite} drops.",
    remiseAZero: "The counter resets {quand}.",
    offre:
      "The full plan opens <nombre>{plafond}</nombre> a month, for <nombre>{prix} €</nombre>. What you've already dropped in stays put, and today's reviews go on.",
    voirLOffre: "See the plan",
    horsVente: "Premium isn't available in English yet.",
    signalement:
      "This limit keeps model costs in check while Kairn is being built. If it gets in your way, say so: that signal will decide what comes next.",
  },
  listeDattente: {
    note: "Noted. We'll let you know if the {motif, select, concepts {concept} other {drop}} limit changes.",
    prevenir: "Tell me if the {motif, select, concepts {concept} other {drop}} limit changes",
  },
};
