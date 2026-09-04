/**
 * Une affirmation dont on ne sait pas si elle est vraie.
 *
 * Un vrai ou faux ne porte pas ses options en base : ce sont toujours les deux
 * mêmes, et c'est le verdict qui dit laquelle est la bonne. Sans lui, la
 * question ne peut pas se poser en vrai ou faux — elle retombe en question
 * ouverte, et l'écran affiche alors une phrase à plat, sans ses deux boutons,
 * en demandant de se juger dessus.
 *
 * **C'est un défaut sérieux et pas un pis-aller**, parce qu'une affirmation sur
 * deux est fausse par construction : « Staline s'impose seul dès la mort de
 * Lénine, sans éliminer progressivement ses rivaux » servi sans son verdict se
 * lit comme le concept à retenir. Le produit existe pour fixer des souvenirs ;
 * il fixait des contre-vérités.
 *
 * La cause première était l'écriture — voir `payloadDe` dans `lib/db/variants.ts`
 * — et elle est corrigée. Ce filtre est ce qui reste après : le modèle peut
 * toujours rendre un `TRUE_FALSE` sans `estVraie`, le schéma ne l'y oblige pas,
 * et une question qu'on ne sait pas poser ne doit pas atteindre la base. Le lot
 * en garde trois, comme lorsqu'une question renvoie à un concept qu'on ne montre
 * pas : la facette manquante revient à la réécriture suivante.
 */

/** Un lot débarrassé des affirmations qui ne disent pas leur verdict. */
export function sansAffirmationMuette<T extends { format: string; estVraie?: boolean | null }>(
  lot: readonly T[],
): T[] {
  return lot.filter(
    (question) => question.format !== "TRUE_FALSE" || typeof question.estVraie === "boolean",
  );
}
