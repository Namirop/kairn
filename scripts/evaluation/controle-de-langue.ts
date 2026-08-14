import type { DepotEvalue } from "./execution";
import { langueApparente } from "./langue-apparente";

/**
 * Le dépôt, sa langue déclarée, et celle de ses concepts.
 *
 * Ce contrôle existe parce qu'il a manqué. `18-anglais.txt` a rendu quatre
 * concepts en français, et le banc l'a classé « ok, 0 manquement » : aucun
 * contrôle automatique ne regardait la langue. Le fichier rendait le bug
 * reproductible, il ne le rendait pas visible.
 *
 * Trois questions, et elles ne se remplacent pas. La déclaration peut être juste
 * et l'écriture fausse — c'est le cas observé. Elle peut aussi être fausse et
 * cohérente avec elle-même, et seul le dépôt permet alors de le voir.
 *
 * La troisième a été ajoutée après coup, et c'est la même leçon une fois de
 * plus. Le passage du 14/08 à 17h10 a montré l'extraction corrigée — concepts
 * anglais, `langue: en` — pendant que la génération posait ses questions en
 * français sur ces concepts anglais. Un contrôle qui ne regarde que la moitié
 * de la chaîne déclare « ok » l'autre moitié.
 */
export function manquementsDeLangue(evaluation: DepotEvalue): string[] {
  const declaree = evaluation.langue;

  if (!declaree || evaluation.echec) return [];

  const manquements: string[] = [];
  const duDepot = langueApparente(evaluation.texte);

  if (duDepot && duDepot !== declaree) {
    manquements.push(
      `le dépôt paraît écrit en \`${duDepot}\`, la lecture déclare \`${declaree}\``,
    );
  }

  const desConcepts = langueApparente(
    evaluation.concepts.map((concept) => concept.concept.concept).join(" "),
  );

  if (desConcepts && desConcepts !== declaree) {
    manquements.push(
      `les concepts sont écrits en \`${desConcepts}\`, la lecture déclare \`${declaree}\``,
    );
  }

  const desQuestions = langueApparente(
    evaluation.concepts
      .flatMap((concept) => concept.variants)
      .map((variant) => `${variant.question} ${variant.answerKey}`)
      .join(" "),
  );

  if (desQuestions && desQuestions !== declaree) {
    manquements.push(
      `les questions sont écrites en \`${desQuestions}\`, la lecture déclare \`${declaree}\``,
    );
  }

  return manquements;
}
