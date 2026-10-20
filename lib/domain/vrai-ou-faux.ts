import { tirageDe } from "./tirage-deterministe";

/**
 * Vraie ou fausse : le serveur décide. Laissé au modèle, on tombait à 110
 * fausses sur 125, et répondre « faux » sans lire réussissait. Un modèle ne tient
 * pas une distribution, mais tient une consigne locale ; la cible part donc avant
 * l'appel et la sortie est relue contre elle. Tirage semé : une question garde sa
 * cible et le banc reste rejouable.
 */

/**
 * Une valeur par concept, jamais par facette : nommer des facettes se lisait
 * comme une invitation (`TRUE_FALSE` montait de 25 % à 54 %). La graine est l'id
 * de l'Atom en production, le texte du concept au banc.
 */
export function cibleDuVraiOuFaux(graine: string): boolean {
  return tirageDe(graine)() < 0.5;
}
