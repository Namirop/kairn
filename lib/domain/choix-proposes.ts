import { aplati } from "./texte-aplati";

/**
 * Les choix qu'une question ferme propose.
 *
 * Un QCM porte ses options en base ; un vrai ou faux non, ce sont toujours les
 * deux mêmes. Ce fichier les reconstruit et retrouve laquelle est la bonne.
 *
 * Le booléen du `payload` fait foi. Le premier mot de la réponse-étalon
 * (« Vrai », « Faux ») n'est qu'un repli pour d'anciennes lignes sans booléen :
 * le prompt interdit ce verdict en tête de la réponse.
 */

export type ChoixProposes = {
  options: string[];
  correctIndex: number;
};

/** L'ordre est fixe : l'affirmation d'abord, comme on lit la question. */
export const CHOIX_VRAI_FAUX = ["Vrai", "Faux"] as const;

const INDEX_VRAI = 0;
const INDEX_FAUX = 1;

/** Le premier mot de la réponse, sans ponctuation, sans accent, en minuscules. */
function premierMot(answerKey: string): string {
  return (
    aplati(answerKey)
      .replace(/^[^a-z]+/, "")
      .split(/[^a-z]/)[0]
      ?.trim() ?? ""
  );
}

/**
 * Les choix d'un vrai ou faux, ou `null` si rien ne dit lequel est le bon.
 *
 * Plutôt que désigner une bonne réponse au hasard, `null` renvoie la question en
 * format ouvert, où la personne juge.
 */
export function choixDUnVraiOuFaux(attendu: unknown, answerKey: string): ChoixProposes | null {
  const options = [...CHOIX_VRAI_FAUX];

  if (typeof attendu === "boolean") {
    return { options, correctIndex: attendu ? INDEX_VRAI : INDEX_FAUX };
  }

  const mot = premierMot(answerKey);

  if (mot === "vrai") return { options, correctIndex: INDEX_VRAI };
  if (mot === "faux") return { options, correctIndex: INDEX_FAUX };

  return null;
}
