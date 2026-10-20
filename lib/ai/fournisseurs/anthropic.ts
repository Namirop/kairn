import Anthropic from "@anthropic-ai/sdk";
import { EmissionEchoueeError, SortieAbsenteError } from "../errors";
import { versMessageDuSdk } from "../message";
import type { ParametresDEmission, ResultatDEmission, PontFournisseur } from "./pont";

/**
 * Seul fichier qui importe le SDK : `client.ts` est l'entrée métier, celui-ci
 * l'entrée réseau. Le prompt système, identique d'un appel à l'autre, est mis en
 * cache (au-dessus du minimum du modèle). `thinking: disabled` : aucune intention
 * n'en a montré le besoin ; le rouvrir se décide sur une mesure.
 */

let cachedClient: { key: string; sdk: Anthropic } | null = null;

function sdkFor(apiKey: string | undefined): Anthropic {
  const key = apiKey ?? "";
  if (cachedClient?.key !== key) {
    cachedClient = { key, sdk: new Anthropic({ apiKey }) };
  }
  return cachedClient.sdk;
}

export function pontAnthropic(apiKey: string | undefined): PontFournisseur {
  return {
    nom: "anthropic",
    async emettre(params: ParametresDEmission): Promise<ResultatDEmission> {
      const sdk = sdkFor(apiKey);
      const debut = Date.now();

      let response: Anthropic.Message;
      try {
        response = await sdk.messages.create({
          model: params.model,
          max_tokens: params.maxTokens,
          system: [{ type: "text", text: params.system, cache_control: { type: "ephemeral" } }],
          thinking: { type: "disabled" },
          messages: params.messages.map(versMessageDuSdk),
          output_config: { format: params.formatSchema },
        });
      } catch (erreur) {
        throw new EmissionEchoueeError(params.purpose, erreur);
      }

      const latencyMs = Date.now() - debut;
      const block = response.content.find(
        (candidat): candidat is Anthropic.TextBlock => candidat.type === "text",
      );

      if (!block) throw new SortieAbsenteError(params.purpose);

      return {
        responseText: block.text,
        consommation: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
          cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        },
        latencyMs,
        modeleServi: response.model,
        finishReason:
          response.stop_reason === "max_tokens"
            ? "length"
            : response.stop_reason === "end_turn"
              ? "stop"
              : "other",
      };
    },
  };
}
