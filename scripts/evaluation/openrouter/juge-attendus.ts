import { appelerViaOpenRouter, type ConsommationOpenRouter } from "./client";
import type { ModeleOpenRouter } from "./modeles";
import {
  type AttenduSoumis,
  CONTRAT_ATTENDUS,
  decrireAttendu,
  SYSTEM_ATTENDUS,
  type VerdictAttendu,
} from "../juges/attendus";
import { MOTIF_ABSTENTION_JUGE } from "../juges/residu";
import { TOKENS_DES_JUGES } from "../juges/modele";
import type { Facture } from "./juges";

/**
 * Le juge d'attendus servi via OpenRouter — pendant de `jugerLesAttendus` pour
 * la campagne 1. Un appel par dépôt qui porte des attendus (deux dépôts au
 * corpus), le reste ne consomme rien.
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

export async function jugerLesAttendusVia(
  modele: ModeleOpenRouter,
  nom: string,
  soumis: AttenduSoumis[],
  maxTokens: number = TOKENS_DES_JUGES,
  reasoning?: { effort: "low" | "medium" | "high" } | false,
): Promise<{ verdicts: VerdictAttendu[]; facture: Facture | null }> {
  if (soumis.length === 0) return { verdicts: [], facture: null };

  const contenu = [
    `Dépôt : ${nom}`,
    "",
    `${soumis.length} attendu(s) à juger — verdicts #1 à #${soumis.length}.`,
    "",
    soumis.map(decrireAttendu).join("\n\n"),
  ].join("\n");

  const { valeur, consommation } = await appelerViaOpenRouter({
    contract: CONTRAT_ATTENDUS,
    system: SYSTEM_ATTENDUS,
    messages: [{ role: "user", content: contenu }],
    model: modele.id,
    maxTokens,
    reasoning,
  });

  const parNumero = new Map(valeur.attendus.map((v) => [v.numero, v]));
  const verdicts = soumis.map((_, rang): VerdictAttendu => {
    const v = parNumero.get(rang + 1);
    return v
      ? { couvert: v.couvert, motif: v.motif.trim() }
      : { couvert: null, motif: MOTIF_ABSTENTION_JUGE };
  });

  return { verdicts, facture: facturer(modele, consommation) };
}
