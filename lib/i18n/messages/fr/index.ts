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
 * Les textes de l'interface en français, la langue de référence : la forme de
 * cet objet est le contrat de l'anglais, une clé manquante ne compile pas.
 *
 * Syntaxe ICU de next-intl. Avec `{n, plural, one {…} other {…}}`, le français
 * met zéro au singulier et l'anglais au pluriel, sans rien à écrire de plus.
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
