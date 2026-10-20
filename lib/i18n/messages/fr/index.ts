import { etatDepot } from "./etat-depot";
import { navigation } from "./navigation";
import { racine } from "./racine";
import { temps } from "./temps";
import { revision } from "./revision";
import { depots } from "./depots";
import { tableau } from "./tableau";
import { site } from "./site";
import { compte } from "./compte";
import { emails } from "./emails";
import { legal } from "./legal";

/**
 * Le français, langue de référence : sa forme est le contrat de l'anglais, une
 * clé manquante ne compile pas. En ICU, `one` couvre zéro en français, pas en
 * anglais, sans rien écrire de plus.
 */
export const fr = {
  revision,
  depots,
  tableau,
  site,
  compte,
  emails,
  legal,
  etatDepot,
  navigation,
  racine,
  temps,
};

export type Messages = typeof fr;
