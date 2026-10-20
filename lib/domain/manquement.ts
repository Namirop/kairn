/**
 * Ce qu'on peut reprocher à une génération sans jugement humain. Des détecteurs
 * de fumée : ils peuvent rater une mauvaise question, pas crier sur une bonne.
 * Certaines règles doublent les schémas Zod : le banc juge aussi des sorties
 * qui ne passent pas par `callAI()`.
 */
export type Manquement = {
  /** Le nom de la règle enfreinte, court, réutilisé d'un rapport à l'autre. */
  regle: string;
  detail: string;
  /** L'index de la variante en cause, quand le manquement en vise une. */
  rang?: number;
};
