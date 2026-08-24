import { z, type ZodType } from "zod";
import { AICallFailedError, AIMissingOutputError, AITruncatedOutputError } from "@/lib/ai/errors";
import type { AiMessage } from "@/lib/ai/message";
import { toOutputSchema } from "@/lib/ai/output-schema";
import type { AiContract } from "@/lib/ai/schemas";

/**
 * Le point d'entrée du banc vers OpenRouter, distinct de `lib/ai/client.ts`.
 *
 * Il ne touche à rien de la production : pas de compteur AiCall, pas de
 * réservation AiCallQuota, pas de fixtures. La passerelle et la production
 * partagent seulement les types purs — `AiContract`, `AiMessage`,
 * `toOutputSchema` — et la règle du point d'entrée unique tient toujours du
 * côté Anthropic. La lignée Anthropic passe par `lib/ai/client.ts` ; les
 * challengers passent d'ici.
 *
 * Le portage propre du gagnant vers la production est un chantier séparé,
 * à faire une fois seulement quand la campagne aura tranché.
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
   * Le contrôle du raisonnement interne. Par défaut `{ effort: "low" }` pour
   * borner les modèles reasoning (GLM, o1, DeepSeek R1) — sans borne ils
   * épuisent `maxTokens` en pensée avant la sortie. `false` désactive le
   * paramètre entier, à utiliser pour les modèles servis par un fournisseur
   * qui ne supporte pas `reasoning` (Kimi via Novita, Haiku direct) — avec
   * `provider.require_parameters: true`, OpenRouter renvoie 404 sinon.
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

/**
 * Transforme un message du banc en message OpenRouter. OpenRouter suit le
 * format OpenAI : `content` est soit une chaîne, soit un tableau de parties
 * `{ type: "text", text }` ou `{ type: "image_url", image_url }`. On garde
 * le format tableau uniquement quand une image est présente.
 */
function toOpenRouterMessage(message: AiMessage): {
  role: "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
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
 * Valide la sortie du modèle contre le contrat. La forme est déjà contrainte
 * par la grammaire OpenRouter (`response_format: json_schema strict`), la
 * validation Zod fait respecter en plus les contraintes qui ne descendent
 * pas dans le schéma — bornes, contraintes croisées.
 */
function lireSortie<T>(contract: AiContract<T>, texte: string): T {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new AIMissingOutputError(contract.purpose);
  }
  const parse = (contract.validation as ZodType<T>).safeParse(brut);
  if (!parse.success) {
    if (process.env.OPENROUTER_DEBUG === "1") {
      console.error(`[debug] Sortie brute rejetée pour « ${contract.purpose} » :\n${texte.slice(0, 2000)}`);
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
  // Certains fournisseurs — Alibaba pour Qwen — déclarent supporter
  // `response_format: json_schema strict` mais ne l'honorent que partiellement :
  // ils rendent du JSON, mais renomment les clés (`verdicts` au lieu de
  // `paires`, `numéro` au lieu de `numero`). Le remède qui marche pour de vrai
  // est de recopier le schéma dans le message système en toutes lettres, avec
  // la consigne d'utiliser les clés exactes. Bénin pour Anthropic, OpenAI et
  // Google qui respectent déjà le contrat.
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
        // OpenAI exige que `required` liste **tous** les champs, même ceux
        // déclarés `.nullish()` côté Zod (relevé campagne 1, 2026-08-24 :
        // « In context=('properties', 'atoms', 'items'), 'required' is
        // required to be supplied and to be an array including every key
        // in properties. Missing 'deriveDe'. »). `toOutputSchema` produit
        // un schéma optionnel-friendly qui satisfait Anthropic, Google,
        // DeepSeek, Mistral — corriger toOutputSchema pour OpenAI casserait
        // les autres. On désactive donc `strict` pour cette lignée seule ;
        // la grammaire relâchée reste rattrapée par la validation Zod côté
        // banc, qui refuserait une sortie non conforme.
        strict: !params.model.startsWith("openai/"),
        schema: format.schema,
      },
    },
    // Force OpenRouter à router uniquement vers un fournisseur qui déclare
    // supporter `response_format` — évite le fallback silencieux vers un
    // fournisseur qui rendrait du texte libre.
    provider: { require_parameters: true },
  };
  if (reasoning !== false) corps.reasoning = reasoning;

  const debut = Date.now();
  let reponse: Response;
  try {
    reponse = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cle}`,
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

