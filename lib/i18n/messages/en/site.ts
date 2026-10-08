import type { Messages } from "../fr";
import { accueil } from "./site/accueil";
import { essai } from "./site/essai";
import { sansConcept } from "./site/sans-concept";
import { tarifs } from "./site/tarifs";

export const site: Messages["site"] = {
  accueil,
  essai,
  sansConcept,
  tarifs,
  desinscription: {
    meta: "Stop getting emails",
    titre: "Stop getting emails",
    texte:
      "Your account stays as it is. Only the email reminders stop — you can turn them back on whenever you want.",
    expireTitre: "This link is no longer valid",
    expireTexte:
      "Unsubscribe links expire. Open the most recent email you got, or turn off reminders from your settings.",
    reglages: "Open my settings",
  },
  partage: {
    alt: "Kairn — drop in what you learn, and it brings it back at the right moment.",
    constat: "You read a lot.",
    retournement: "Most of it fades.",
    phrase:
      "Drop in what you learn. Kairn breaks it into concepts and asks you again at the right moment.",
  },
};
