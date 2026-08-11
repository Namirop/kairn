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
