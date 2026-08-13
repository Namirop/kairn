import { z } from "zod";
import { AIConfigError } from "./errors";

/**
 * Les garde-fous, lus et validés à chaque appel plutôt qu'au chargement du
 * module : couper les appels doit prendre effet tout de suite, sans redémarrage.
 */

const booleanFromEnv = z.enum(["true", "false"]).transform((value) => value === "true");

const configSchema = z.object({
  enabled: booleanFromEnv,
  mock: booleanFromEnv,
  dailyCallCap: z.coerce.number().int().positive(),
  /**
   * Ce qu'un seul compte peut prendre dans la journée. Le plafond global
   * protège le budget ; celui-ci protège les utilisateurs les uns des autres.
   */
  userDailyCallCap: z.coerce.number().int().positive(),
  model: z.string().min(1),
  maxTokens: z.coerce.number().int().positive(),
  apiKey: z.string().min(1).optional(),
});

export type AiConfig = z.infer<typeof configSchema>;

export function readAiConfig(): AiConfig {
  const parsed = configSchema.safeParse({
    enabled: process.env.AI_ENABLED,
    mock: process.env.MOCK_AI,
    dailyCallCap: process.env.AI_DAILY_CALL_CAP,
    userDailyCallCap: process.env.AI_DAILY_CALL_CAP_PAR_COMPTE,
    model: process.env.AI_MODEL,
    maxTokens: process.env.AI_MAX_TOKENS,
    apiKey: process.env.ANTHROPIC_API_KEY || undefined,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")} : ${issue.message}`);
    throw new AIConfigError(`Configuration IA invalide — ${issues.join(" ; ")}`);
  }

  return parsed.data;
}

/**
 * La même configuration, mais déjà typée — celle qu'on obtient après avoir posé
 * des surcharges par-dessus l'environnement.
 *
 * Elle est revalidée et non pas seulement fusionnée : une valeur venue de la base
 * n'a pas traversé le schéma de l'environnement, et un plafond à zéro ou un
 * modèle vide couperait toute l'ingestion sans rien dire. Mieux vaut lever ici,
 * avec un message, que servir une configuration absurde.
 */
const configEffectiveSchema = z.object({
  enabled: z.boolean(),
  mock: z.boolean(),
  dailyCallCap: z.number().int().positive(),
  userDailyCallCap: z.number().int().positive(),
  model: z.string().min(1),
  maxTokens: z.number().int().positive(),
  apiKey: z.string().min(1).optional(),
});

/** Ce qu'une surcharge peut porter. Une clé absente laisse l'environnement. */
export type SurchargesDeConfig = Partial<Omit<AiConfig, "apiKey">>;

/**
 * L'environnement, puis ce que la base pose par-dessus.
 *
 * L'ordre est le sens de la règle : l'environnement est la valeur par défaut, la
 * base est l'exception qu'on assume. Retirer une surcharge suffit donc à revenir
 * au défaut, sans avoir à se souvenir de ce qu'il valait.
 */
export function appliquerLesSurcharges(base: AiConfig, surcharges: SurchargesDeConfig): AiConfig {
  const parsed = configEffectiveSchema.safeParse({ ...base, ...surcharges });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")} : ${issue.message}`);
    throw new AIConfigError(`Réglage posé invalide — ${issues.join(" ; ")}`);
  }

  return parsed.data;
}
