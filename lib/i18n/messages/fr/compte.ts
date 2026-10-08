import { connexion } from "./compte/connexion";
import { donnees } from "./compte/donnees";
import { offre } from "./compte/offre";
import { reglages } from "./compte/reglages";
import { retour } from "./compte/retour";

/** La connexion, l'inscription, les réglages, l'offre du compte, l'export et la suppression. */
export const compte = { connexion, reglages, donnees, offre, retour };
