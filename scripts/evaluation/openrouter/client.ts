import { z } from "zod";
import { AICallFailedError, AIMissingOutputError, AITruncatedOutputError } from "@/lib/ai/errors";
import type { AiMessage } from "@/lib/ai/message";
import { toOutputSchema } from "@/lib/ai/output-schema";
import type { AiContract } from "@/lib/ai/schemas";

/**
 * Le point d'entrée du banc vers OpenRouter, distinct de `lib/ai/client.ts`.
 *
 * Il ne touche à rien de la production : ni `AiCall`, ni réservation de quota,
 * ni fixtures. Il ne partage avec elle que les types purs (`AiContract`,
 * `AiMessage`, `toOutputSchema`).
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type AppelOpenRouterParams<T> = {
  contract: AiContract<T>;
  system: string;
  messages: AiMessage[];
  /** Identifiant OpenRouter du modèle, `<fournisseur>/<slug>`. */
  model: string;
  maxTokens: number;
  /**
   * Par défaut `{ effort: "low" }` : sans borne, les modèles à raisonnement
   * épuisent `maxTokens` en pensée avant la sortie. `false` retire le paramètre
   * pour les fournisseurs qui ne le supportent pas (Kimi via Novita, Haiku) :
   * avec `require_parameters`, OpenRouter renverrait 404.
   */
  reasoning?: { effort: "low" | "medium" | "high" } | false;
};

export type ConsommationOpenRouter = {
  inputTokens: number;
  outputTokens: number;
  /** Coût rendu par OpenRouter en dollars, quand il l'accompagne. */
  costUsd: number | null;
  latencyMs: number;
  /** Le modèle réellement servi ; OpenRouter peut re-router vers un fournisseur alternatif. */
  modele: string;
};

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
});

const reponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(choix).min(1),
  usage,
});

/** Un message du banc au format OpenAI que suit OpenRouter. */
function toOpenRouterMessage(message: AiMessage): {
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

/**
 * La grammaire `json_schema` contraint la forme ; Zod ajoute ce qui ne descend
 * pas dans le schéma (bornes, contraintes croisées).
 */
function lireSortie<T>(contract: AiContract<T>, texte: string): T {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new AIMissingOutputError(contract.purpose);
  }
  const parse = contract.validation.safeParse(brut);
  if (!parse.success) {
    if (process.env.OPENROUTER_DEBUG === "1") {
      console.error(
        `[debug] Sortie brute rejetée pour « ${contract.purpose} » :\n${texte.slice(0, 2000)}`,
      );
    }
    throw new AICallFailedError(contract.purpose, parse.error);
  }
  return parse.data;
}

export async function appelerViaOpenRouter<T>(
  params: AppelOpenRouterParams<T>,
): Promise<{ valeur: T; consommation: ConsommationOpenRouter }> {
  const cle = process.env.OPENROUTERAI_KEY?.trim();
  if (!cle) {
    throw new Error(
      "OPENROUTERAI_KEY absente de l'environnement — la passerelle OpenRouter ne peut pas partir.",
    );
  }

  const format = toOutputSchema(params.contract.forme);
  // Certains fournisseurs (Alibaba pour Qwen) honorent mal `json_schema strict`
  // et renomment les clés. Recopier le schéma dans le système, avec consigne de
  // garder les clés, y remédie ; c'est bénin pour les autres.
  const preambule = `Réponds au format JSON, conforme exactement à ce schéma. Utilise les clés telles qu'elles apparaissent, sans les renommer ni les traduire.

${JSON.stringify(format.schema)}

`;

  const reasoning = params.reasoning ?? { effort: "low" as const };
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
        name: params.contract.purpose,
        // En strict, OpenAI exige que `required` liste tous les champs, même
        // `.nullish()` ; adapter `toOutputSchema` casserait les autres lignées.
        // `strict` est donc coupé pour OpenAI seul, Zod rattrape derrière.
        strict: !params.model.startsWith("openai/"),
        schema: format.schema,
      },
    },
    // N'accepte que les fournisseurs qui supportent `response_format`, sans
    // repli silencieux vers du texte libre.
    provider: { require_parameters: true },
  };
  if (reasoning !== false) corps.reasoning = reasoning;

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
    throw new AICallFailedError(params.contract.purpose, erreur);
  }

  if (!reponse.ok) {
    const detail = await reponse.text().catch(() => reponse.statusText);
    throw new AICallFailedError(
      params.contract.purpose,
      new Error(`OpenRouter ${reponse.status} — ${detail.slice(0, 500)}`),
    );
  }

  const latencyMs = Date.now() - debut;
  const brut: unknown = await reponse.json();
  const parseReponse = reponseSchema.safeParse(brut);
  if (!parseReponse.success) {
    throw new AICallFailedError(params.contract.purpose, parseReponse.error);
  }

  const decodee = parseReponse.data;
  const premier = decodee.choices[0];
  if (!premier) throw new AIMissingOutputError(params.contract.purpose);
  if (premier.finish_reason === "length") {
    throw new AITruncatedOutputError(params.contract.purpose, params.maxTokens);
  }
  if (premier.message.content === null || premier.message.content.length === 0) {
    throw new AIMissingOutputError(params.contract.purpose);
  }

  const valeur = lireSortie(params.contract, premier.message.content);

  return {
    valeur,
    consommation: {
      inputTokens: decodee.usage.prompt_tokens,
      outputTokens: decodee.usage.completion_tokens,
      costUsd: decodee.usage.cost ?? null,
      latencyMs,
      modele: decodee.model,
    },
  };
}
