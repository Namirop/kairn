/**
 * Ce que la personne fait pour répondre : c'est le geste répété qui lasse, pas
 * le format. Un format inconnu tombe dans « formuler », comme dans la zone de
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
