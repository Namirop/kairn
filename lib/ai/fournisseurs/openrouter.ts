import { z } from "zod";
import { AICallFailedError, AIMissingOutputError } from "../errors";
import type { AiMessage } from "../message";
import type { EmissionParams, EmissionResult, PontFournisseur } from "./interface";

/**
 * Le pont OpenRouter — porté du module du banc
 * (`scripts/evaluation/openrouter/client.ts`) avec les réglages qui ont fait
 * tenir la campagne :
 *
 * - **`strict: false` pour les modèles OpenAI** — leur validateur JSON Schema
 *   exige que `required` liste tous les champs, y compris `.nullish()` côté
 *   Zod. `toOutputSchema` du produit rend les optionnels comme optionnels
 *   (comportement respecté par Anthropic, Google, DeepSeek, Mistral). Corriger
 *   `toOutputSchema` casserait ces quatre. Sans `strict`, Zod côté nous
 *   rattrape une sortie non conforme.
 * - **Préambule schéma-en-clair** dans le message système, pour les
 *   fournisseurs qui rendent du JSON mais renomment les clés (relevé Alibaba
 *   pour Qwen à l'arrêt 1).
 * - **`provider.require_parameters: true`** — force OpenRouter à router
 *   uniquement vers un fournisseur qui déclare supporter `response_format`.
 * - **Pas de `reasoning`** — Mistral 404 sinon, et les modèles du produit ne
 *   sont pas des modèles reasoning de toute façon.
 *
 * Clé lue depuis `OPENROUTER_API_KEY` (production), **distincte de la clé du
 * banc** `OPENROUTERAI_KEY` : le banc dépense sur ses propres crédits, la
 * production sur les siens. Une seule clé partagée ferait passer les deux
 * pour la même usage à OpenRouter — impossible de couper l'un sans couper
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
  prompt_tokens_details: z
    .object({ cached_tokens: z.number().optional() })
    .optional(),
});

const reponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(choix).min(1),
  usage,
});

function toOpenRouterMessage(message: AiMessage): {
  role: "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
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
    async emettre(params: EmissionParams): Promise<EmissionResult> {
      const cle = apiKey?.trim();
      if (!cle) {
        throw new Error(
          "OPENROUTER_API_KEY absente — la lignée OpenRouter ne peut pas partir.",
        );
      }

      const preambule = `Réponds au format JSON, conforme exactement à ce schéma. Utilise les clés telles qu'elles apparaissent, sans les renommer ni les traduire.

${JSON.stringify(params.formatSchema.schema)}

`;

      // Épingler le fournisseur pour les modèles OpenAI — sans ça, OpenRouter
      // peut re-router vers Azure ou une passerelle alternative, qui a son
      // propre cache (ou pas de cache du tout). Le cache OpenAI n'est efficace
      // que si les requêtes atterrissent toujours chez OpenAI. Voir la fiche
      // portage-luna, §4.
      const provider: Record<string, unknown> = { require_parameters: true };
      if (params.model.startsWith("openai/")) {
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
            strict: !params.model.startsWith("openai/"),
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
        throw new AICallFailedError(params.purpose, erreur);
      }

      if (!reponse.ok) {
        const detail = await reponse.text().catch(() => reponse.statusText);
        throw new AICallFailedError(
          params.purpose,
          new Error(`OpenRouter ${reponse.status} — ${detail.slice(0, 500)}`),
        );
      }

      /*
        Le chronomètre s'arrête **après** la lecture du corps, et c'est tout le
        sujet.

        `fetch` rend la main dès l'arrivée des en-têtes ; le corps, lui, se
        remplit au fil de la génération. Mesurer entre les deux ne chronométrait
        donc pas l'appel mais la poignée de main — d'où des latences plates
        autour de cinq cents millisecondes quelle que soit la longueur rendue,
        quarante tokens comme mille deux cents, pendant que le job qui portait
        l'appel en mettait dix fois plus. Le registre `AiCall` a sous-évalué
        toutes les lignes OpenRouter depuis le portage. Le pont Anthropic n'a
        jamais eu le défaut : son SDK ne rend la main qu'une fois le message
        complet.
      */
      const brut: unknown = await reponse.json();
      const latencyMs = Date.now() - debut;
      const parseReponse = reponseSchema.safeParse(brut);
      if (!parseReponse.success) {
        throw new AICallFailedError(params.purpose, parseReponse.error);
      }

      const decodee = parseReponse.data;
      const premier = decodee.choices[0];
      if (!premier) throw new AIMissingOutputError(params.purpose);

      const finishReason: EmissionResult["finishReason"] =
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
        throw new AIMissingOutputError(params.purpose);
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

function consommationDepuisUsage(u: z.infer<typeof usage>): EmissionResult["consommation"] {
  const cacheRead = u.prompt_tokens_details?.cached_tokens ?? 0;
  // OpenAI ne facture pas l'écriture du cache (contrairement à Anthropic ×1,25)
  // — on ne rend donc pas de `cacheCreationTokens` non nul. `inputTokens`, ici,
  // désigne les tokens **non cachés** : OpenRouter renvoie `prompt_tokens` en
  // total, on retire la part cache pour la comptabilité.
  return {
    inputTokens: Math.max(0, u.prompt_tokens - cacheRead),
    outputTokens: u.completion_tokens,
    cacheCreationTokens: 0,
    cacheReadTokens: cacheRead,
  };
}
