/**
 * Les choix qu'une question ferme propose.
 *
 * Un QCM porte ses options en base. Un vrai ou faux, non : ce sont toujours les
 * deux mêmes, et les écrire à chaque question serait du stockage pour rien. Ce
 * fichier reconstruit donc ses choix, et retrouve lequel est le bon.
 *
 * Deux sources écrivent ces questions et ne disent pas la vérité au même
 * endroit : le contenu de démonstration pose un booléen dans le `payload`, la
 * génération n'y met rien et commence sa réponse par « Vrai » ou « Faux ». On
 * lit le booléen quand il existe, la réponse sinon.
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
    answerKey
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/^[^a-z]+/, "")
      .split(/[^a-z]/)[0]
      ?.trim() ?? ""
  );
}

/**
 * Les choix d'un vrai ou faux, ou `null` si rien ne dit lequel est le bon.
 *
 * Le `null` compte : plutôt que de désigner une bonne réponse au hasard sur une
 * donnée qu'on ne sait pas lire, on laisse la question repartir en format
 * ouvert, où c'est la personne qui juge.
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
