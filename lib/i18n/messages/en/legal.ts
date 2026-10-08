import type { Messages } from "../fr";
import { confidentialite } from "./legal/confidentialite";
import { mentionsLegales } from "./legal/mentions-legales";

export const legal: Messages["legal"] = {
  gabarit: {
    aCompleter: "To be completed — {manque}",
    retourAccueil: "Back to home",
  },
  confidentialite,
  mentionsLegales,
};
