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
