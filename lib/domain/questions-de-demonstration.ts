/**
 * Les questions qu'on pose au visiteur pendant que son texte se découpe.
 *
 * L'attente dure une dizaine de secondes, sur le seul écran qui convertit, et
 * elle ne montrait qu'un gabarit qui bat. Un gabarit dit « ça charge » ; il ne
 * dit rien de ce qu'on est en train de fabriquer, et dix secondes de rien
 * suffisent à faire fermer un onglet.
 *
 * Ce qu'on met à la place n'est pas une distraction rapportée d'ailleurs — pas
 * un jeu, pas un compte à rebours, pas une astuce à lire. C'est **le produit
 * lui-même** : une vraie question, du format et du ton de celles qu'on écrit,
 * à laquelle on répond en un clic. Quelqu'un qui a répondu à une question de
 * Kairn avant même d'avoir vu son découpage a compris le produit ; c'est très
 * exactement ce qu'on cherchait à obtenir de l'attente.
 *
 * **Elles portent sur les mêmes matières que les invites du champ** — une
 * astuce de cuisine, un mot d'allemand, une ligne de documentation. C'est le
 * même argument dit deux fois, à deux moments : on peut déposer n'importe quoi.
 *
 * Le format est nommé par sa valeur d'enum et non par son libellé : l'écran le
 * traduit avec `LIBELLE_FORMAT`, comme il traduit celui d'une vraie question.
 * Recopier « QCM » ici en ferait un second vocabulaire à tenir à jour.
 */

export type QuestionDeDemonstration = {
  format: "MCQ" | "TRUE_FALSE";
  enonce: string;
  /** Deux à trois propositions. Au-delà, on lit une liste au lieu de choisir. */
  reponses: readonly string[];
  /** Le rang de la bonne réponse dans `reponses`. */
  bonne: number;
  /**
   * Ce qu'on dit une fois répondu.
   *
   * Une phrase, et elle apprend quelque chose. C'est la seule récompense du
   * produit : on ne félicite pas, on explique — et ce qu'on explique ici est
   * aussi ce que le vrai découpage rendra dans quelques secondes.
   */
  precision: string;
};

export const QUESTIONS_DE_DEMONSTRATION = [
  {
    format: "MCQ",
    enonce: "À quoi sert le repos d'une heure d'une pâte à crêpes ?",
    reponses: ["À dissoudre les grumeaux", "À détendre le gluten", "À laisser le beurre figer"],
    bonne: 1,
    precision:
      "Les grumeaux se règlent au fouet, pas à l'attente. Le repos détend le gluten, et c'est lui qui fait des crêpes souples plutôt que caoutchouteuses.",
  },
  {
    format: "TRUE_FALSE",
    enonce: "En allemand, « doch » sert à confirmer une phrase négative.",
    reponses: ["Vrai", "Faux"],
    bonne: 1,
    precision:
      "Il la contredit. À « Du kommst nicht mit ? », « doch » répond « si, je viens » — ce que l'anglais ne sait pas dire d'un mot.",
  },
  {
    format: "MCQ",
    enonce: "Un index PostgreSQL sur `(a, b)` sert-il une requête qui ne filtre que sur `b` ?",
    reponses: [
      "Oui, l'ordre des colonnes ne change rien",
      "Non, l'ordre des colonnes décide de ce qu'il couvre",
    ],
    bonne: 1,
    precision:
      "Un index composite se lit de la gauche vers la droite : il couvre `a`, ou `a` et `b`, jamais `b` seul.",
  },
] as const satisfies readonly QuestionDeDemonstration[];

/**
 * Une question, tirée d'un nombre entre 0 et 1.
 *
 * Le tirage est passé en paramètre, comme pour les invites du champ : la
 * fonction reste pure, donc rejouable dans un test. Ici l'appelant tire après le
 * montage plutôt qu'au rendu — la question n'apparaît qu'au bout de quelques
 * secondes d'attente, et un tirage fait pendant le rendu ferait diverger le
 * serveur du navigateur sur les visites qui rechargent la page en plein
 * découpage.
 */
export function questionDeDemonstration(tirage: number): QuestionDeDemonstration {
  const bornes = Math.min(Math.max(tirage, 0), 0.999999);
  const rang = Math.floor(bornes * QUESTIONS_DE_DEMONSTRATION.length);

  return QUESTIONS_DE_DEMONSTRATION[rang] ?? QUESTIONS_DE_DEMONSTRATION[0];
}
