import type { VariantFormat } from "@/lib/db/types";

/**
 * L'ordre dans lequel la vitrine montre les formats.
 *
 * Il était celui du lot — l'ordre où le modèle avait écrit les questions —,
 * donc il changeait d'un dépôt à l'autre. Sur la page qui convertit, ça se paie
 * deux fois : la démonstration ne se raconte pas pareil selon le tirage, et
 * personne ne peut décrire ce que la page montre puisque personne ne sait ce
 * qu'elle montrera.
 *
 * L'ordre va donc du plus immédiat au plus exigeant. Le QCM se lit sans rien
 * savoir du produit — la question, ses propositions, on comprend. Le vrai ou
 * faux est le même geste en plus court. Le texte à trou demande déjà de
 * produire quelque chose. L'explication demande de reformuler, et c'est la
 * dernière parce que c'est la plus lente à lire.
 *
 * `SHORT_ANSWER` et `CODE` ferment la marche : ils existent dans le schéma, la
 * génération de la vitrine ne les sert pratiquement jamais, et les intercaler
 * couperait une progression qui se tient.
 *
 * Le `Record` sur l'enum est volontaire, comme pour `LIBELLE_FORMAT` : ajouter
 * un format sans décider de sa place ne compile pas.
 */
const RANG_DU_FORMAT: Record<VariantFormat, number> = {
  MCQ: 0,
  TRUE_FALSE: 1,
  CLOZE: 2,
  EXPLAIN: 3,
  SHORT_ANSWER: 4,
  CODE: 5,
};

export function parOrdreDeFormat<T extends { format: VariantFormat }>(questions: T[]): T[] {
  return [...questions].sort((a, b) => RANG_DU_FORMAT[a.format] - RANG_DU_FORMAT[b.format]);
}
