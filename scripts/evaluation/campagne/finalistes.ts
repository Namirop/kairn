import { CHALLENGERS, type ModeleOpenRouter } from "../openrouter/modeles";

/** Les finalistes désignés à l'arrêt 2, partagés par le plan et l'émission de la campagne 2. */
const FINALISTES_IDS = new Set(["google/gemini-3.7-flash", "openai/gpt-5.6-luna"]);

export function finalistes(): ModeleOpenRouter[] {
  const trouves = CHALLENGERS.filter((c) => FINALISTES_IDS.has(c.id));
  if (trouves.length !== FINALISTES_IDS.size) {
    const attendus = [...FINALISTES_IDS].join(", ");
    throw new Error(`Finalistes introuvables dans CHALLENGERS. Attendus : ${attendus}.`);
  }
  return trouves;
}
