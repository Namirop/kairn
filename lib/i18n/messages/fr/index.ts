import { etatDepot } from "./etat-depot";
import { navigation } from "./navigation";
import { racine } from "./racine";
import { temps } from "./temps";

/**
 * Les textes de l'interface, en français — la langue de référence.
 *
 * Un espace de noms par domaine de l'interface, un fichier par espace : deux
 * personnes qui traduisent deux écrans ne touchent jamais le même fichier. La
 * forme de cet objet est le contrat de l'anglais : une clé qui manque de l'autre
 * côté ne compile pas.
 *
 * Les textes suivent la syntaxe ICU de next-intl. Les pluriels s'y écrivent
 * `{n, plural, one {# concept} other {# concepts}}` : le français y met zéro
 * au singulier et l'anglais au pluriel, sans qu'on ait à s'en souvenir.
 */
export const fr = {
  etatDepot,
  navigation,
  racine,
  temps,
};

export type Messages = typeof fr;
