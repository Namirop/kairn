import { appelerViaOpenRouter, type ConsommationOpenRouter } from "./client";
import type { ModeleOpenRouter } from "./modeles";
import type { VariantFige } from "../fige";
import {
  CONTRAT_DOUBLON,
  SYSTEM_DOUBLON,
  decrirePaire,
  deriverIndependance,
  type VerdictDoublon,
} from "../juges/doublon";
import {
  CONTRAT_FIDELITE,
  SYSTEM_FIDELITE,
  decrireQuestion,
  type VerdictFidelite,
} from "../juges/fidelite";
import { TOKENS_DES_JUGES } from "../juges/modele";
import type { Paire } from "../mesures/signaux";

/**
 * Les juges du doublon et de la fidélité, servis via OpenRouter au lieu de
 * l'API Anthropic directe. Réservé au banc de comparaison des modèles —
 * l'arrêt 1 y valide un juge candidat avant de laisser partir la campagne.
 *
 * Le prompt, le schéma et la lecture des questions sont ceux exportés par
 * `juges/doublon.ts` et `juges/fidelite.ts` : un seul endroit décide comment
 * on interroge un juge, quel que soit le fournisseur qui l'exécute. Ne rien
 * dupliquer garde la référence Sonnet et les challengers comparables — un
 * prompt qui divergerait au banc mesurerait autre chose que la production.
 */

export type Facture = {
  inputTokens: number;
  outputTokens: number;
  coutUsd: number;
  latencyMs: number;
};

/**
 * Le coût catalogue de l'appel. On n'utilise pas `consommation.costUsd` :
 * OpenRouter ne le rend que pour une partie des modèles, et la mesure du banc
 * doit se lire à partir des prix épinglés — c'est cette borne-là qui gouverne
 * la règle §5, pas la ristourne éventuelle du fournisseur.
 */
function facturer(modele: ModeleOpenRouter, consommation: ConsommationOpenRouter): Facture {
  const coutUsd =
    (consommation.inputTokens * modele.prixInParM +
      consommation.outputTokens * modele.prixOutParM) /
    1_000_000;
  return {
    inputTokens: consommation.inputTokens,
    outputTokens: consommation.outputTokens,
    coutUsd,
    latencyMs: consommation.latencyMs,
  };
}

/**
 * Un appel juge doublon sur une liste de paires du même dépôt, via le modèle
 * OpenRouter donné. Renvoie un verdict par paire, dans l'ordre soumis, et la
 * facture au prix catalogue.
 */
export async function jugerLesDoublonsVia(
  modele: ModeleOpenRouter,
  nom: string,
  paires: Paire[],
  /** Défaut = budget de sortie de la campagne, la même barre pour tous les
   * challengers. Voir `BUDGET_SORTIE_CAMPAGNE` dans `campagne.ts` pour la
   * règle : le seul appelant qui a le droit de dépasser est le script
   * `valider-le-juge.ts`, où les six paires témoins sont groupées en un
   * unique appel — l'arrêt 1 n'est pas la campagne. */
  maxTokens: number = TOKENS_DES_JUGES,
  /** Voir `AppelOpenRouterParams` — `false` pour un modèle dont le fournisseur
   * ne supporte pas `reasoning` (Kimi via Novita), sinon défaut « low ». */
  reasoning?: { effort: "low" | "medium" | "high" } | false,
): Promise<{ verdicts: VerdictDoublon[]; facture: Facture }> {
  const contenu = [
    `Dépôt : ${nom}`,
    "",
    `${paires.length} paire(s) à juger — verdicts #1 à #${paires.length}.`,
    "",
    paires.map((paire, rang) => decrirePaire(paire, rang)).join("\n\n"),
  ].join("\n");

  const { valeur, consommation } = await appelerViaOpenRouter({
    contract: CONTRAT_DOUBLON,
    system: SYSTEM_DOUBLON,
    messages: [{ role: "user", content: contenu }],
    model: modele.id,
    maxTokens,
    reasoning,
  });

  const parNumero = new Map(valeur.paires.map((v) => [v.numero, v]));
  const verdicts = paires.map((_, rang): VerdictDoublon => {
    const rendu = parNumero.get(rang + 1);
    if (!rendu) return { independants: null, sens: null, questionSurA: null, questionSurB: null };
    return deriverIndependance(rendu.questionSurA, rendu.questionSurB);
  });

  return { verdicts, facture: facturer(modele, consommation) };
}

/**
 * Un appel juge fidélité sur un concept et ses questions, via le modèle
 * OpenRouter donné. Renvoie un verdict par question, dans l'ordre, et la
 * facture au prix catalogue.
 */
export async function jugerLaFideliteVia(
  modele: ModeleOpenRouter,
  concept: string,
  variants: VariantFige[],
  maxTokens: number = TOKENS_DES_JUGES,
  reasoning?: { effort: "low" | "medium" | "high" } | false,
): Promise<{ verdicts: VerdictFidelite[]; facture: Facture }> {
  const contenu = [
    "## Concept",
    "",
    concept,
    "",
    `## ${variants.length} question(s)`,
    "",
    variants.map(decrireQuestion).join("\n\n"),
  ].join("\n");

  const { valeur, consommation } = await appelerViaOpenRouter({
    contract: CONTRAT_FIDELITE,
    system: SYSTEM_FIDELITE,
    messages: [{ role: "user", content: contenu }],
    model: modele.id,
    maxTokens,
    reasoning,
  });

  const parNumero = new Map(valeur.questions.map((v) => [v.numero, v]));
  const verdicts = variants.map((_, rang): VerdictFidelite => {
    const rendu = parNumero.get(rang + 1);
    return rendu
      ? { juste: rendu.juste, motif: rendu.motif.trim() }
      : { juste: null, motif: "non rendu par le juge" };
  });

  return { verdicts, facture: facturer(modele, consommation) };
}
