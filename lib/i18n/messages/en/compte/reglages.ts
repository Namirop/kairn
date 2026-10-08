import type { Messages } from "../../fr";

export const reglages: Messages["compte"]["reglages"] = {
  metaTitre: "Settings",
  titre: "Settings",
  chapo: "What you do in Kairn, and what Kairn does without you.",
  adresse: {
    intitule: "Email",
    raison:
      "It's your account's identity: you sign in with it, since there's no password. Changing it means verifying the new one before switching.",
  },
  fuseau: {
    intitule: "Time zone",
    raison:
      "Detected from your browser on each visit, and updated on its own if you change countries. It decides what day it is for you, and when your reminder goes out.",
  },
  probleme: {
    titre: "A problem, a comment",
    texte:
      "Logic that surprises you, a word that's off, a screen that overflows. It happens to a person, never to the numbers — without you, nobody will know.",
  },
  commentCaMarche: "How it works",
  formulaire: {
    session: "Your session",
    plafond: {
      intitule: "Concepts per day",
      explication:
        "From {min} to {max}. Beyond that, a session becomes a chore you drop halfway, and what overflows isn't lost: it stays due, and comes first the next day.",
    },
    envois: "What we send you",
    rappel: {
      intitule: "Daily reminder",
      explication:
        "An email at the time you choose, on days when something is due. Nothing to review, nothing sent.",
      a: "At",
      fuseau: "in your time zone.",
    },
    alerte: {
      intitule: "Streak alert",
      explication:
        "In the evening, only if your streak is running, nothing has been reviewed, and something is left to do. Most days, it doesn't go out.",
    },
    emails: {
      intitule: "Emails",
      explication:
        "When off, nothing goes out except the sign-in code — without it, nobody could get back into their account.",
    },
    modifie: "Changed, not saved yet",
    unInstant: "One moment",
    enregistrer: "Save",
  },
  reponses: {
    plafond: "A session holds {min} to {max} concepts. Whatever overflows comes back the next day.",
    heure: "The reminder goes out on the hour. For example, 7 pm or 8 am.",
    echec: "These settings couldn't be saved. Try again.",
    enregistre: "Saved.",
    enregistreSansEmails: "Saved. Emails turned off.",
  },
};
