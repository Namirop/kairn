/**
 * Ce qu'on peut reprocher à une génération sans jugement humain.
 *
 * Le banc d'évaluation lit ces manquements pour dire « regarde ici ». Ce sont
 * des détecteurs de fumée : ils peuvent rater une mauvaise question, mais ne
 * doivent pas crier sur une bonne.
 *
 * Certaines règles doublent les schémas Zod de `lib/ai/` : le banc juge aussi
 * des sorties qui ne passent pas par `callAI()` (dump, contre-exemple écrit à
 * la main).
 */
export type Manquement = {
  /** Le nom de la règle enfreinte, court, réutilisé d'un rapport à l'autre. */
  regle: string;
  detail: string;
  /** L'index de la variante en cause, quand le manquement en vise une. */
  rang?: number;
};
