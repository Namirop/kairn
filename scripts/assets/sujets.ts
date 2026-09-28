import { readFileSync } from "node:fs";
import path from "node:path";
import type { AiImagePart } from "@/lib/ai/message";
import type { Depot } from "@/scripts/evaluation/corpus";

/**
 * Les sujets de démonstration, calqués sur les contenus de Romain.
 *
 * Chaque sujet est un Input — du texte qu'on colle, ou une capture qu'on joint.
 * Le contenu est rédigé (c'est ce qu'un utilisateur dépose) ; les concepts et
 * les questions, eux, ne le sont jamais : ils sortent du vrai pipeline, figés
 * une fois par `figer-les-sujets.ts`.
 *
 * Les textes sont factuels à dessein : un concept marqué douteux ne part pas en
 * génération. Les répliques de séries sont donc cadrées comme de l'apprentissage
 * de langue — ce que l'expression signifie —, pas comme de la fiction.
 */

export type Sujet = {
  /** Slug : nomme les fichiers de sortie et la clé du figé. */
  cle: string;
  titre: string;
  depot: Depot;
};

const DOSSIER = path.join(import.meta.dirname, "sujets");
const CORPUS = path.join(import.meta.dirname, "..", "evaluation", "corpus");

function texte(cle: string, titre: string, fichier: string): Sujet {
  return {
    cle,
    titre,
    depot: { nom: cle, texte: readFileSync(path.join(DOSSIER, fichier), "utf8").trim() },
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
  // Une capture d'assistant reconstituée : elle exerce l'OCR et sert le dépôt
  // « avec une capture d'écran jointe ». Réutilisée du corpus du banc.
  image("capture-assistant", "Capture d'écran jointe", "07-capture-assistant.png", "image/png"),
];

/** Le rang d'un sujet dans l'ordre canonique, pour trier le figé. */
export function ordreDuSujet(cle: string): number {
  const rang = SUJETS.findIndex((sujet) => sujet.cle === cle);

  return rang === -1 ? SUJETS.length : rang;
}
