import type { Messages } from "../fr";
import { connexion } from "./compte/connexion";
import { donnees } from "./compte/donnees";
import { offre } from "./compte/offre";
import { reglages } from "./compte/reglages";
import { retour } from "./compte/retour";

export const compte: Messages["compte"] = { connexion, reglages, donnees, offre, retour };
