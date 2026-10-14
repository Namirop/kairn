import { readFileSync } from "node:fs";
import path from "node:path";
import type { AiImagePart } from "@/lib/ai/message";
import type { Depot } from "@/scripts/evaluation/corpus";

/**
 * Les sujets de démonstration. Seul le dépôt est rédigé : les concepts et les
 * questions sortent du vrai pipeline, figés par `figer-les-sujets.ts`.
 *
 * Les textes sont factuels à dessein, un concept douteux ne partant pas en
 * génération : les répliques de séries sont cadrées comme de l'apprentissage de
 * langue, pas comme de la fiction.
 */

export type Sujet = {
  /** Slug : nomme les fichiers de sortie et la clé du figé. */
  cle: string;
  titre: string;
  depot: Depot;
};

const DOSSIER = path.join(import.meta.dirname, "sujets");
const CORPUS = path.join(import.meta.dirname, "..", "evaluation", "corpus");

/**
 * Le dépôt porte le nom de son fichier, comme au banc : un `.en.` dans le nom
 * le fait déposer par quelqu'un qui révise en anglais (`langueDuDepot`).
 */
function texte(cle: string, titre: string, fichier: string): Sujet {
  return {
    cle,
    titre,
    depot: { nom: fichier, texte: readFileSync(path.join(DOSSIER, fichier), "utf8").trim() },
  };
}

function image(
  cle: string,
  titre: string,
  fichier: string,
  mediaType: AiImagePart["mediaType"],
): Sujet {
  return {
    cle,
    titre,
    depot: {
      nom: cle,
      texte: "",
      image: { base64: readFileSync(path.join(CORPUS, fichier)).toString("base64"), mediaType },
    },
  };
}

export const SUJETS: Sujet[] = [
  texte("vocabulaire-anglais", "Vocabulaire anglais", "vocabulaire-anglais.txt"),
  texte("repliques-series", "Répliques de séries en anglais", "repliques-series.txt"),
  texte("notes-lecture", "Notes de lecture — développement personnel", "notes-lecture.txt"),
  texte("cours-histoire", "Cours d'histoire", "cours-histoire.txt"),
  texte("reponse-assistant", "Réponse d'assistant collée", "reponse-assistant.txt"),
  texte("article-presse", "Article de presse", "article-presse.txt"),
  // Une capture reconstituée, reprise du corpus du banc, pour exercer l'OCR.
  image("capture-assistant", "Capture d'écran jointe", "07-capture-assistant.png", "image/png"),
  // Le seul sujet anglais, pour les captures de l'interface anglaise.
  texte("cours-biologie", "Biology class", "cours-biologie.en.txt"),
];

/** Le rang d'un sujet dans l'ordre canonique, pour trier le figé. */
export function ordreDuSujet(cle: string): number {
  const rang = SUJETS.findIndex((sujet) => sujet.cle === cle);

  return rang === -1 ? SUJETS.length : rang;
}
