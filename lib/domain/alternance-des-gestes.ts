import { type GesteDeReponse } from "./geste-de-reponse";

/**
 * Alterne les gestes de réponse au lieu de les enchaîner.
 *
 * Une session peut servir cinq fois « choisis ta réponse » d'affilée sans qu'un
 * seul format se répète : le QCM et le vrai ou faux se répondent du même geste,
 * et c'est le geste qu'on ressent. On croit alors relire la même question.
 *
 * Le remaniement est **minimal**, et c'est la différence avec l'alternance des
 * sujets. Celle-là recompose l'ordre entier depuis les files ; celle-ci garde
 * l'ordre reçu et ne déplace que ce qu'il faut : quand le suivant refait le geste
 * qu'on vient de faire, on avance le premier qui en change. L'ordre d'urgence et
 * l'alternance des sujets sont déjà passés par là — ils n'ont pas à être défaits
 * pour ça.
 *
 * Deux fois la même entrée rend deux fois la même sortie : rien n'est tiré au
 * hasard.
 */
export function alternerLesGestes<T>(items: T[], gesteDe: (item: T) => GesteDeReponse): T[] {
  const restants = [...items];
  const ordonnes: T[] = [];
  let precedent: GesteDeReponse | null = null;

  while (restants.length > 0) {
    // Aucun autre geste disponible : on garde l'ordre reçu plutôt que d'écourter.
    const rang = Math.max(
      restants.findIndex((item) => gesteDe(item) !== precedent),
      0,
    );
    const [choisi] = restants.splice(rang, 1);

    if (!choisi) break;

    ordonnes.push(choisi);
    precedent = gesteDe(choisi);
  }

  return ordonnes;
}
