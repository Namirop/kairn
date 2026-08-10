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
