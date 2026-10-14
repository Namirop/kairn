/**
 * Ce que la personne fait pour répondre, indépendamment du format.
 *
 * Un QCM et un vrai ou faux sont deux formats et un seul geste : c'est le geste
 * répété qui lasse, pas le format.
 *
 * Choisir se clique, saisir s'écrit dans un champ vérifiable, formuler se juge
 * soi-même. Un format inconnu tombe dans « formuler », comme dans la zone de
 * réponse.
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
