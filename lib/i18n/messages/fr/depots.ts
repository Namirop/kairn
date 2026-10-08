import { concept, facettes, formats } from "./depots/concept";
import { depot, liste } from "./depots/depot";
import { formulaire } from "./depots/formulaire";
import { refus } from "./depots/refus";

/** Le dépôt : le formulaire, l'attente, la page d'un dépôt, ses concepts, la liste, les plafonds. */
export const depots = { liste, formulaire, depot, concept, facettes, formats, refus };
