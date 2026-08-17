/**
 * Ce que la personne fait pour répondre, indépendamment du format.
 *
 * Un QCM et un vrai ou faux sont deux formats et un seul geste : on choisit dans
 * une liste. Cinq questions d'affilée sur ce geste-là donnent l'impression d'être
 * resté sur la même question, alors que les formats variaient — c'est le geste
 * qui lasse, pas l'étiquette qu'on lui donne.
 *
 * C'est aussi le découpage de l'écran de réponse : choisir se clique, saisir
 * s'écrit dans un champ vérifiable, formuler se juge soi-même. Un format inconnu
 * tombe dans « formuler », comme la zone de réponse le fait déjà de son côté
 * quand elle ne sait pas quoi servir.
 */
export type GesteDeReponse = "CHOISIR" | "SAISIR" | "FORMULER";

const GESTES: Record<string, GesteDeReponse> = {
  MCQ: "CHOISIR",
  TRUE_FALSE: "CHOISIR",
  CLOZE: "SAISIR",
  SHORT_ANSWER: "FORMULER",
  EXPLAIN: "FORMULER",
  CODE: "FORMULER",
};

export function gesteDeReponse(format: string): GesteDeReponse {
  return GESTES[format] ?? "FORMULER";
}
