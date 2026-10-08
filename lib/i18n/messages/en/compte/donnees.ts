import type { Messages } from "../../fr";

export const donnees: Messages["compte"]["donnees"] = {
  titre: "Your data",
  texte:
    "You can take what you dropped in with you at any time: a file with your drops, the concepts drawn from them, their questions and your reviews.",
  telecharger: "Download my data",
  fichier: "kairn-my-data-{date}.json",
  avertissement:
    "This erases the account, your drops, your concepts, their questions and all your reviews. It's immediate and can't be undone. Download your data first.",
  recopie: "Type “{mot}” to confirm",
  suppression: "Deleting…",
  supprimer: "Delete for good",
  annuler: "Cancel",
  ouvrir: "Delete my account",
  erreurs: {
    confirmation: "Type “{mot}” to confirm.",
    abonnement:
      "Your subscription couldn't be stopped, and we don't delete an account that's still paying. Try again in a moment.",
    introuvable: "This account can't be found.",
  },
};
