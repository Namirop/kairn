import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { AiImagePart } from "@/lib/ai/message";
import type { LangueDuProduit } from "@/lib/domain/langue-du-produit";

/**
 * Le corpus du banc : un dépôt par fichier, lus dans l'ordre de leur nom. Un
 * fichier texte est un dépôt tel qu'on le collerait ; une image est une
 * capture, qui passe par `ocr_extract` avant l'extraction. Ajouter un cas,
 * c'est déposer un fichier ici.
 *
 * Ce que chaque cas met à l'épreuve, quand le nom ne suffit pas :
 *
 * - `08` à `10` : du texte à trou sur des savoirs sans code, où la règle `CODE`
 *   ne doit jamais se déclencher
 * - `11-sigles-scientifiques` : le piège inverse. `UVB`, `ADN`, `pH` donnent au
 *   déclencheur de la règle `CODE` ses majuscules et sa casse mixte sans une
 *   ligne de code ; le prompt porte la même règle, et ce dépôt dit si le modèle
 *   y tombe aussi
 * - `07-capture-assistant.png` : une interface reconstituée, avec son habillage
 *   (barre de titre, conversations, horodatage, saisie) autour d'une réponse à
 *   retenir, pour la consigne « jette l'habillage ». Une capture réelle peut la
 *   remplacer sous le même nom
 * - `13-rejet-opinion`, `14-rejet-trop-vague` : le piège est le faux positif,
 *   un concept fabriqué qui n'est nulle part dans le texte
 * - `15-redondance-interne` : une idée dite trois fois. Il dit si le modèle
 *   compte des idées ou des formulations ; c'est le premier à regarder quand le
 *   plafond de concepts monte
 * - `16-concepts-imbriques` : pour la règle « un détail d'un concept voisin y
 *   est rattaché »
 * - `17-faux-grand-public` : `uncertain` hors du technique — deux erreurs nettes,
 *   et une simplification acceptable à laisser tranquille
 * - `18-anglais` : un témoin de conformité, pas un piège. Les concepts français
 *   qu'il rend sont le résultat attendu
 * - `19-chiffres-et-dates` : le trou doit tomber sur un chiffre utile, pas sur
 *   un mot de liaison
 * - `20-narratif-historique` : des mécanismes à extraire d'un récit, plutôt
 *   que sa chronologie
 * - `21-mixte-exploitable-et-organisation` : attendu, des concepts et aucun
 *   rejet
 * - `22-article-long`, `23-pave-maximal`, `26-pave-double` : les seuls dépôts
 *   assez denses pour observer le plafond de concepts ; `23` éprouve aussi
 *   `AI_MAX_TOKENS` sur une sortie pleine. `26` colle `22` aux dix premiers
 *   paragraphes de `23` pour rester sous `CARACTERES_MAXIMUM` : un banc qui
 *   mesure ce que le produit ne peut pas recevoir ne mesure rien. Aucun
 *   n'atteint `PLAFOND_CONCEPTS_PAR_DEPOT` : la troncature n'est prouvée que par
 *   un test unitaire
 * - `24-fiction`, `25-notes-personnelles` : des énoncés qui n'ont pas à être
 *   vrais du monde. On y regarde `nature`, et qu'aucun concept ne parte mis de
 *   côté — un modèle qui les marque douteux les prive de toute question
 * - `28` à `30`, la langue de sortie, venus de la production :
 *   `28-citations-etrangeres` est un texte français qui cite beaucoup
 *   d'espagnol, le cas traître où la langue apparente n'est pas celle de la
 *   personne (les citations restent telles quelles) ; `29-integralement-espagnol`
 *   double `18` dans une langue romane, où le glissement est plus facile ;
 *   `30-vocabulaire-bilingue` est le seul qui éprouve la direction du texte à
 *   trou, qui doit tomber sur l'expression anglaise, pas sur sa glose
 *
 * **Un nom qui porte `.en.` est un dépôt fait par quelqu'un qui révise en
 * anglais** : consigne anglaise, sortie attendue en anglais. La langue est celle
 * de la personne, pas du texte — `31-phrase-courte.en.txt` peut contenir du
 * français, c'est même le cas qui compte.
 *
 * `31` à `35` reprennent `01`, `04`, `06`, `17` et `28` pour comparer une même
 * matière d'une langue à l'autre. `36-vocabulaire-bilingue.en` est le miroir de
 * `30` : le trou tombe sur l'expression française, la glose s'écrit en anglais.
 * `37-depot-francais.en` est le miroir de `18` : un texte entièrement français
 * contre la consigne « tu écris toujours en anglais ».
 */

/** La langue de la personne qui fait ce dépôt, lue sur son nom. */
export function langueDuDepot(nom: string): LangueDuProduit {
  return /\.en\.[a-z]+$/i.test(nom) ? "EN" : "FR";
}

export type Depot = {
  nom: string;
  texte: string;
  image?: { base64: string; mediaType: AiImagePart["mediaType"] };
};

const DOSSIER = join(import.meta.dirname, "corpus");

const IMAGES: Record<string, AiImagePart["mediaType"]> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const TEXTES = [".txt", ".md"];

function lireDepot(nom: string): Depot | null {
  const extension = extname(nom).toLowerCase();
  const chemin = join(DOSSIER, nom);
  const mediaType = IMAGES[extension];

  if (mediaType) {
    return {
      nom,
      texte: "",
      image: { base64: readFileSync(chemin).toString("base64"), mediaType },
    };
  }

  if (!TEXTES.includes(extension)) return null;

  return { nom, texte: readFileSync(chemin, "utf8").trim() };
}

export function lireCorpus(): Depot[] {
  return readdirSync(DOSSIER)
    .sort()
    .map(lireDepot)
    .filter((depot): depot is Depot => depot !== null);
}
