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
  /**
   * Ce que le trafic sans compte peut prendre dans la journée, tous visiteurs
   * confondus. Le plafond par compte protège les comptes les uns des autres ;
   * celui-ci protège les deux populations l'une de l'autre.
   */
  anonymousDailyCallCap: z.coerce.number().int().positive(),
  model: z.string().min(1),
  maxTokens: z.coerce.number().int().positive(),
  apiKey: z.string().min(1).optional(),
});

export type AiConfig = z.infer<typeof configSchema>;

/** La variable derrière chaque champ. Sans elle, l'erreur ne dit pas quoi corriger. */
const VARIABLE: Record<string, string> = {
  enabled: "AI_ENABLED",
  mock: "MOCK_AI",
  dailyCallCap: "AI_DAILY_CALL_CAP",
  userDailyCallCap: "AI_DAILY_CALL_CAP_PAR_COMPTE",
  anonymousDailyCallCap: "AI_DAILY_CALL_CAP_ANONYME",
  model: "AI_MODEL",
  maxTokens: "AI_MAX_TOKENS",
};

/**
 * Une valeur d'environnement débarrassée de ce qu'une recopie y ajoute.
 *
 * Les espaces de bord et une paire de guillemets, rien de plus. `dotenv` fait
 * déjà ce nettoyage sur un fichier ; l'interface d'un hébergeur ne fait rien du
 * tout, et c'est là qu'une valeur arrive avec un guillemet ou une espace en
 * trop. Une variable vide vaut absente : sur ces formulaires, effacer un champ
 * laisse une chaîne vide et non rien.
 *
 * On ne va pas plus loin. Retirer un `# …` de fin de ligne réparerait le collage
 * malheureux le plus courant, mais un `#` peut appartenir à une valeur —
 * deviner l'intention est le début d'une configuration qui ment.
 */
function propre(valeur: string | undefined): string | undefined {
  const nette = valeur
    ?.trim()
    .replace(/^(["'])([\s\S]*)\1$/, "$2")
    .trim();

  return nette === "" ? undefined : nette;
}

/** Assez pour reconnaître la valeur, pas assez pour noyer le journal. */
function extrait(valeur: string): string {
  return valeur.length > 60 ? `${valeur.slice(0, 60)}…` : valeur;
}

/**
 * Ce qui a été refusé, et ce qui avait été reçu.
 *
 * Le message dit la variable et la valeur, parce que « expected one of
 * "true"|"false" » sans la valeur laisse chercher : on lit la bonne valeur dans
 * l'interface de l'hébergeur, on la croit juste, et on ne voit pas l'espace ou
 * le commentaire qui la suit. La montrer transforme une soirée en dix secondes.
 *
 * `ANTHROPIC_API_KEY` n'est pas dans la table et n'a donc jamais de valeur
 * montrée — un message d'erreur part dans des journaux qu'on partage.
 */
function diagnostic(erreur: z.ZodError, brut: Record<string, string | undefined>): string {
  return erreur.issues
    .map((issue) => {
      const champ = String(issue.path[0] ?? "");
      const nom = VARIABLE[champ];

      if (!nom) return `${champ} : ${issue.message}`;

      const recu = brut[champ];

      return `${nom} : ${issue.message} — reçu ${recu === undefined ? "rien" : `« ${extrait(recu)} »`}`;
    })
    .join(" ; ");
}

export function readAiConfig(): AiConfig {
  const brut: Record<string, string | undefined> = {
    enabled: propre(process.env.AI_ENABLED),
    mock: propre(process.env.MOCK_AI),
    dailyCallCap: propre(process.env.AI_DAILY_CALL_CAP),
    userDailyCallCap: propre(process.env.AI_DAILY_CALL_CAP_PAR_COMPTE),
    anonymousDailyCallCap: propre(process.env.AI_DAILY_CALL_CAP_ANONYME),
    model: propre(process.env.AI_MODEL),
    maxTokens: propre(process.env.AI_MAX_TOKENS),
  };

  const parsed = configSchema.safeParse({
    ...brut,
    apiKey: propre(process.env.ANTHROPIC_API_KEY),
  });

  if (!parsed.success) {
    throw new AIConfigError(`Configuration IA invalide — ${diagnostic(parsed.error, brut)}`);
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
  anonymousDailyCallCap: z.number().int().positive(),
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
