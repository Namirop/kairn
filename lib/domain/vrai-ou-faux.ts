import { tirageDe } from "./tirage-deterministe";

/**
 * Vraie ou fausse : c'est le serveur qui décide, question par question.
 *
 * Laissé au modèle, la proportion tombait à 110 fausses sur 125 : répondre
 * « faux » sans lire réussissait, et FSRS l'aurait lu comme de la mémoire. Un
 * modèle ne tient pas une distribution par consigne, mais il tient une consigne
 * locale (« celle-ci est vraie »). Contrairement au QCM, on ne peut pas
 * corriger après coup : la cible part avant l'appel et la sortie est relue
 * contre elle.
 *
 * Tirage déterministe et semé : une question garde sa cible, et le rejeu du banc
 * reste comparable.
 */

/**
 * La cible d'un lot : `true` si son affirmation doit être vraie.
 *
 * Une valeur par concept, jamais par facette : nommer des facettes dans l'envoi
 * se lisait comme une invitation, et `TRUE_FALSE` montait de 25 % à 54 % des
 * questions. La cible s'applique à la question qui porte le format, quelle
 * qu'elle soit.
 *
 * La graine est l'id de l'Atom en production, le texte du concept au banc.
 */
export function cibleDuVraiOuFaux(graine: string): boolean {
  return tirageDe(graine)() < 0.5;
}
