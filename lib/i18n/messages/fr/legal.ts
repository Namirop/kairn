import { confidentialite } from "./legal/confidentialite";
import { mentionsLegales } from "./legal/mentions-legales";

/** Les pages légales : mentions légales et confidentialité. */
export const legal = {
  gabarit: {
    aCompleter: "À compléter — {manque}",
    retourAccueil: "Retour à l'accueil",
  },
  confidentialite,
  mentionsLegales,
};
