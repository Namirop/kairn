import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { AiImagePart } from "@/lib/ai/message";

/**
 * Le corpus du banc : des dépôts d'exemple, un par fichier, lus dans l'ordre
 * de leur nom. Un fichier texte est un dépôt tel qu'on le collerait dans
 * l'application ; une image est une capture, et passe alors par `ocr_extract`
 * avant l'extraction.
 *
 * Ajouter un cas au banc, c'est déposer un fichier ici. Rien à déclarer.
 *
 * Le corpus n'est pas un corpus de développeur. Les dépôts `08` à `10` sont là
 * pour ça : une observation scientifique, un fait pratique, et des notes prises
 * à la volée. Ils exercent le texte à trou sur des connaissances qui ne citent
 * aucun code, là où la règle `CODE` ne doit jamais se déclencher.
 *
 * `11-sigles-scientifiques.txt` tend le piège inverse, et c'est volontaire. Le
 * déclencheur de la règle CODE cherche trois majuscules d'affilée et de la
 * casse mixte : `UVB`, `ADN`, `OMS`, `pH` les lui donnent sans qu'il y ait la
 * moindre ligne de code. Le prompt porte la même règle, formulée de la même
 * façon — ce dépôt existe pour voir si le modèle y tombe aussi, parce que c'est
 * ce que déposera un utilisateur qui apprend autre chose que l'informatique.
 *
 * `07-capture-assistant.png` est une interface reconstituée, pas une vraie
 * capture : elle porte de l'habillage — barre de titre, liste de
 * conversations, horodatage, compteur de mentions, suggestions, zone de
 * saisie — autour d'une réponse à retenir. C'est ce qui met à l'épreuve la
 * consigne « jette l'habillage ». Une capture réelle la remplace en la
 * déposant à sa place.
 *
 * `12` à `23` couvrent ce que les onze premiers laissaient dans l'ombre, et
 * sont tous hors du registre technique :
 *
 * - `12-borne-basse` : le texte le plus court qu'on accepte, un concept
 * - `13-rejet-opinion`, `14-rejet-trop-vague` : les deux familles de rejet que
 *   `06` ne couvrait pas. Le piège des deux est le faux positif — un modèle
 *   serviable fabrique un concept qui n'est nulle part dans le texte
 * - `15-redondance-interne` : la même idée dite trois fois avec trois
 *   vocabulaires. C'est le dépôt qui dit si le modèle compte des idées ou des
 *   formulations, et donc le premier à regarder quand le plafond de concepts
 *   monte
 * - `16-concepts-imbriques` : une idée et quatre précisions sans existence
 *   propre, pour la règle « un détail d'un concept voisin y est rattaché »
 * - `17-faux-grand-public` : `uncertain` hors du technique, deux erreurs nettes
 *   et une simplification acceptable qu'il faut laisser tranquille
 * - `18-anglais` : le seul dépôt non francophone, pour « écris dans la langue
 *   du dépôt »
 * - `19-chiffres-et-dates` : de quoi trouer un chiffre utile plutôt qu'un mot
 *   de liaison
 * - `20-narratif-historique` : des mécanismes noyés dans un récit, là où il
 *   serait plus facile d'extraire la chronologie
 * - `21-mixte-exploitable-et-organisation` : moitié savoir, moitié tâches.
 *   Attendu : des concepts, et aucun rejet
 * - `22-article-long` (3 644 signes) et `23-pave-maximal` (6 815 signes) : les
 *   seuls dépôts assez denses pour que le plafond de concepts soit observable.
 *   Sans eux, on modifierait une borne que l'instrument ne sait pas mesurer.
 *   `23` est aussi le seul à éprouver `AI_MAX_TOKENS` sur une sortie pleine
 *
 * `26-pave-double` existe pour une seule chose : dépasser le plafond de vingt
 * concepts pour de bon. `23` a rendu dix-neuf au passage du 14/08, donc la
 * troncature n'a jamais eu à couper et n'est prouvée que par un test unitaire.
 * Il colle `22` aux dix premiers paragraphes de `23` — et pas les deux fichiers
 * entiers, qui feraient 10 782 signes quand un dépôt en accepte 8 000
 * (`CARACTERES_MAXIMUM`) : un banc qui mesure ce que le produit ne peut pas
 * recevoir ne mesure rien.
 *
 * `24-fiction` et `25-notes-personnelles` éprouvent la nature du dépôt. Leurs
 * énoncés n'ont pas à être vrais du monde — les règles d'un jeu inventé, le
 * fonctionnement interne d'une équipe — et un modèle qui les marquerait
 * douteux les priverait de toute question. Ce qu'on regarde sur ces deux-là
 * n'est donc pas le nombre de concepts mais `nature`, et le fait qu'aucun
 * concept ne parte mis de côté.
 */

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
