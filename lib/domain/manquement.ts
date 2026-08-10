/**
 * Ce qu'on peut reprocher à une génération sans jugement humain.
 *
 * Le banc d'évaluation lit ces manquements pour dire « regarde ici » ; il ne dit
 * pas si la question est bonne, ça se juge à l'œil. Ce sont des détecteurs de
 * fumée : ils ratent des mauvaises questions, ils ne doivent pas crier sur des
 * bonnes.
 *
 * Certaines règles sont déjà refusées par les schémas Zod de `lib/ai/`. Les
 * contrôles restent parce que le banc doit pouvoir juger une sortie qui ne vient
 * pas de `callAI()` — un dump, une génération d'hier, un contre-exemple écrit à
 * la main.
 */
export type Manquement = {
  /** Le nom de la règle enfreinte, court, réutilisé d'un rapport à l'autre. */
  regle: string;
  detail: string;
  /**
   * L'index de la variante en cause, quand le manquement en vise une. Un
   * compteur sans emplacement est inutilisable : il annonce un problème et
   * laisse le chercher dans huit cents lignes.
   */
  rang?: number;
};
