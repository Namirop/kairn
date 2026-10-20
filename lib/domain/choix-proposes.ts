import { aplati } from "./texte-aplati";

/**
 * Les choix d'un vrai ou faux, qui n'a pas d'options en base. Le booléen du
 * `payload` fait foi ; le premier mot de la réponse-étalon n'est qu'un repli
 * pour d'anciennes lignes, le prompt interdisant ce verdict en tête.
 */

export type ChoixProposes = {
  options: string[];
  correctIndex: number;
};

/** L'ordre est fixe : l'affirmation d'abord, comme on lit la question. */
export const CHOIX_VRAI_FAUX = ["Vrai", "Faux"] as const;

const INDEX_VRAI = 0;
const INDEX_FAUX = 1;

function premierMot(answerKey: string): string {
  return (
    aplati(answerKey)
      .replace(/^[^a-z]+/, "")
      .split(/[^a-z]/)[0]
      ?.trim() ?? ""
  );
}

/** `null` si rien ne dit le bon : la question passe en format ouvert, où la personne juge. */
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
