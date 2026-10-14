import { z } from "zod";
import { EmissionEchoueeError, SortieAbsenteError } from "../errors";
import type { MessageIa } from "../message";
import type { ParametresDEmission, ResultatDEmission, PontFournisseur } from "./pont";

/**
 * Le pont OpenRouter, avec les réglages du banc
 * (`scripts/evaluation/openrouter/client.ts`) :
 *
 * - `strict: false` pour les modèles OpenAI : leur validateur exige que
 *   `required` liste tous les champs, `.nullish()` compris, alors que
 *   `deriverLeSchemaDeSortie` rend les optionnels comme optionnels — ce que les autres
 *   fournisseurs attendent. Zod rattrape côté nous une sortie non conforme.
 * - Un préambule schéma-en-clair pour les modèles non stricts, qui sinon
 *   renomment les clés.
 * - `provider.require_parameters: true` : ne router que vers un fournisseur qui
 *   supporte `response_format`.
 * - Pas de `reasoning` : certains fournisseurs répondent 404.
 *
 * La clé `OPENROUTER_API_KEY` est distincte de celle du banc
 * (`OPENROUTERAI_KEY`) : chacun dépense sur ses crédits, et l'un se coupe sans
 * l'autre.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const messageDeReponse = z.object({
  role: z.string(),
  content: z.string().nullable(),
});

const choix = z.object({
  message: messageDeReponse,
  finish_reason: z.string().nullable(),
});

const usage = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
  /** Certains modèles renvoient le coût facturé, d'autres non. */
  cost: z.number().optional(),
  /** OpenAI (via OpenRouter) rend les tokens en cache dans `prompt_tokens_details.cached_tokens`. */
  prompt_tokens_details: z.object({ cached_tokens: z.number().optional() }).optional(),
});

const schemaDeReponse = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(choix).min(1),
  usage,
});

function toOpenRouterMessage(message: MessageIa): {
  role: "user" | "assistant";
  content:
    | string
    | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
} {
  if (typeof message.content === "string") {
    return { role: message.role, content: message.content };
  }
  return {
    role: message.role,
    content: message.content.map((part) =>
      part.type === "text"
        ? { type: "text" as const, text: part.text }
        : {
            type: "image_url" as const,
            image_url: { url: `data:${part.mediaType};base64,${part.base64}` },
          },
    ),
  };
}

export function pontOpenRouter(apiKey: string | undefined): PontFournisseur {
  return {
    nom: "openrouter",
    async emettre(params: ParametresDEmission): Promise<ResultatDEmission> {
      const cle = apiKey?.trim();
      if (!cle) {
        throw new Error("OPENROUTER_API_KEY absente — la lignée OpenRouter ne peut pas partir.");
      }

      // Le schéma n'est pas imposé aux modèles OpenAI — leur mode strict refuse
      // nos schémas —, alors on le leur dit en toutes lettres. Sonnet, imposé,
      // n'en reçoit pas : sa consigne reste celle que les campagnes ont validée.
      const strict = !params.model.startsWith("openai/");
      const preambule = strict
        ? ""
        : `Réponds au format JSON, conforme exactement à ce schéma. Utilise les clés telles qu'elles apparaissent, sans les renommer ni les traduire.

${JSON.stringify(params.formatSchema.schema)}

`;

      // Fournisseur épinglé pour les modèles OpenAI : re-routé vers Azure ou une
      // autre passerelle, l'appel perdrait le cache d'OpenAI.
      const provider: Record<string, unknown> = { require_parameters: true };
      if (!strict) {
        provider.order = ["OpenAI"];
        provider.allow_fallbacks = false;
      }

      const corps: Record<string, unknown> = {
        model: params.model,
        max_tokens: params.maxTokens,
        messages: [
          { role: "system" as const, content: `${preambule}${params.system}` },
          ...params.messages.map(toOpenRouterMessage),
        ],
        response_format: {
          type: "json_schema" as const,
          json_schema: {
            name: params.purpose,
            strict,
            schema: params.formatSchema.schema,
          },
        },
        provider,
      };

      const debut = Date.now();
      let reponse: Response;
      try {
        reponse = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cle}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corps),
        });
      } catch (erreur) {
        throw new EmissionEchoueeError(params.purpose, erreur);
      }

      if (!reponse.ok) {
        const detail = await reponse.text().catch(() => reponse.statusText);
        throw new EmissionEchoueeError(
          params.purpose,
          new Error(`OpenRouter ${reponse.status} — ${detail.slice(0, 500)}`),
        );
      }

      // Le chronomètre s'arrête après la lecture du corps : `fetch` rend la main
      // dès les en-têtes, et le corps se remplit au fil de la génération. Mesuré
      // avant, on chronométrerait la poignée de main.
      const brut: unknown = await reponse.json();
      const latencyMs = Date.now() - debut;
      const parseReponse = schemaDeReponse.safeParse(brut);
      if (!parseReponse.success) {
        throw new EmissionEchoueeError(params.purpose, parseReponse.error);
      }

      const decodee = parseReponse.data;
      const premier = decodee.choices[0];
      if (!premier) throw new SortieAbsenteError(params.purpose);

      const finishReason: ResultatDEmission["finishReason"] =
        premier.finish_reason === "length"
          ? "length"
          : premier.finish_reason === "stop"
            ? "stop"
            : "other";

      if (premier.message.content === null || premier.message.content.length === 0) {
        if (finishReason === "length") {
          return {
            responseText: "",
            consommation: consommationDepuisUsage(decodee.usage),
            latencyMs,
            modeleServi: decodee.model,
            finishReason,
          };
        }
        throw new SortieAbsenteError(params.purpose);
      }

      return {
        responseText: premier.message.content,
        consommation: consommationDepuisUsage(decodee.usage),
        latencyMs,
        modeleServi: decodee.model,
        finishReason,
      };
    },
  };
}

function consommationDepuisUsage(u: z.infer<typeof usage>): ResultatDEmission["consommation"] {
  const cacheRead = u.prompt_tokens_details?.cached_tokens ?? 0;
  // OpenAI ne facture pas l'écriture du cache, d'où `cacheCreationTokens` à 0.
  // `prompt_tokens` est un total : `inputTokens` n'en garde que la part non
  // cachée.
  return {
    inputTokens: Math.max(0, u.prompt_tokens - cacheRead),
    outputTokens: u.completion_tokens,
    cacheCreationTokens: 0,
    cacheReadTokens: cacheRead,
  };
}
