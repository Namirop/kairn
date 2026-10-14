import Anthropic from "@anthropic-ai/sdk";
import { AICallFailedError, AIMissingOutputError } from "../errors";
import { toSdkMessage } from "../message";
import type { EmissionParams, EmissionResult, PontFournisseur } from "./interface";

/**
 * Le pont Anthropic, seul endroit du projet qui importe le SDK. Le point
 * d'entrée unique tient : `client.ts` est l'entrée métier, ce fichier l'entrée
 * réseau.
 *
 * Le prompt système porte `cache_control: ephemeral` : il est identique d'un
 * appel à l'autre. Sous le minimum de mise en cache du modèle, rien n'est mis
 * en cache — le registre le dit.
 *
 * `thinking: disabled` : aucune des trois intentions n'a montré besoin de
 * raisonnement. Le rouvrir se décide sur une mesure.
 */

let cachedClient: { key: string; sdk: Anthropic } | null = null;

/** Le SDK, prêt à servir. Privé : ce fichier est le seul à connaître le paquet. */
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
    async emettre(params: EmissionParams): Promise<EmissionResult> {
      const sdk = sdkFor(apiKey);
      const debut = Date.now();

      let response: Anthropic.Message;
      try {
        response = await sdk.messages.create({
          model: params.model,
          max_tokens: params.maxTokens,
          system: [{ type: "text", text: params.system, cache_control: { type: "ephemeral" } }],
          thinking: { type: "disabled" },
          messages: params.messages.map(toSdkMessage),
          output_config: { format: params.formatSchema },
        });
      } catch (erreur) {
        throw new AICallFailedError(params.purpose, erreur);
      }

      const latencyMs = Date.now() - debut;
      const block = response.content.find(
        (candidat): candidat is Anthropic.TextBlock => candidat.type === "text",
      );

      if (!block) throw new AIMissingOutputError(params.purpose);

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
