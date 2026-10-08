import type { Messages } from "../fr";
import { concept, facettes, formats } from "./depots/concept";
import { depot, liste } from "./depots/depot";
import { formulaire } from "./depots/formulaire";
import { refus } from "./depots/refus";

export const depots: Messages["depots"] = {
  liste,
  formulaire,
  depot,
  concept,
  facettes,
  formats,
  refus,
};
