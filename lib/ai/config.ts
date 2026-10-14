import { z } from "zod";
import { ConfigIaInvalideError } from "./errors";
import type { Fournisseur } from "./fournisseurs";

/**
 * Les garde-fous, lus et validés à chaque appel plutôt qu'au chargement du
 * module : couper les appels doit prendre effet tout de suite, sans redémarrage.
 */

/**
 * « true » depuis l'environnement, `true` depuis la base. Normalisé avant
 * validation plutôt qu'en union, pour qu'un refus nomme les deux valeurs
 * attendues au lieu de « Invalid input ».
 */
const booleen = z.preprocess(
  (valeur) => (typeof valeur === "boolean" ? String(valeur) : valeur),
  z.enum(["true", "false"]).transform((value) => value === "true"),
);

const schemaDeConfig = z.object({
  enabled: booleen,
  mock: booleen,
  dailyCallCap: z.coerce.number().int().positive(),
  /** Le plafond global protège le budget ; celui-ci, les comptes les uns des autres. */
  userDailyCallCap: z.coerce.number().int().positive(),
  /** Tous visiteurs confondus : protège comptes et visiteurs les uns des autres. */
  anonymousDailyCallCap: z.coerce.number().int().positive(),
  model: z.string().min(1),
  maxTokens: z.coerce.number().int().positive(),
  apiKey: z.string().min(1).optional(),
  /**
   * Le fournisseur qui sert les appels, `anthropic` si la variable manque.
   * `openrouter` (voir `fournisseurs/openrouter.ts`) exige `OPENROUTER_API_KEY`,
   * distincte de la clé du banc.
   */
  fournisseur: z
    .enum(["anthropic", "openrouter"] as const satisfies readonly Fournisseur[])
    .default("anthropic"),
  openrouterApiKey: z.string().min(1).optional(),
});

export type ConfigIa = z.infer<typeof schemaDeConfig>;

/** Ce qu'une surcharge peut porter. Une clé absente laisse l'environnement. */
export type SurchargesDeConfig = Partial<Omit<ConfigIa, "apiKey">>;

/**
 * Les variables de plafond, à part parce qu'une alerte de plafond nomme celle à
 * changer : une seconde table ailleurs finirait par diverger.
 */
const VARIABLE_DE_PLAFOND = {
  dailyCallCap: "AI_DAILY_CALL_CAP",
  userDailyCallCap: "AI_DAILY_CALL_CAP_PAR_COMPTE",
  anonymousDailyCallCap: "AI_DAILY_CALL_CAP_ANONYME",
} as const;

/** La variable derrière chaque champ. Sans elle, l'erreur ne dit pas quoi corriger. */
const VARIABLE: Record<string, string> = {
  enabled: "AI_ENABLED",
  mock: "MOCK_AI",
  ...VARIABLE_DE_PLAFOND,
  model: "AI_MODEL",
  maxTokens: "AI_MAX_TOKENS",
  fournisseur: "AI_FOURNISSEUR",
};

/** Le nom de la variable derrière un plafond, pour qui doit le changer. */
export function variableDuPlafond(champ: keyof typeof VARIABLE_DE_PLAFOND): string {
  return VARIABLE_DE_PLAFOND[champ];
}

/**
 * Une valeur d'environnement sans espaces de bord ni paire de guillemets :
 * l'interface d'un hébergeur, contrairement à `dotenv`, ne nettoie rien. Vide
 * vaut absente, un champ effacé y laissant une chaîne vide.
 *
 * Un `# …` de fin de ligne n'est pas retiré : un `#` peut appartenir à la valeur.
 */
function propre(valeur: string | undefined): string | undefined {
  const nette = valeur
    ?.trim()
    .replace(/^(["'])([\s\S]*)\1$/, "$2")
    .trim();

  return nette === "" ? undefined : nette;
}

/** Assez pour reconnaître la valeur, pas assez pour noyer le journal. */
function extrait(valeur: unknown): string {
  const texte = String(valeur);

  return texte.length > 60 ? `${texte.slice(0, 60)}…` : texte;
}

/**
 * Chaque refus nomme la variable, la valeur reçue et sa provenance : sans la
 * valeur, une espace ou un commentaire en trop reste invisible ; « reçu rien »
 * envoie chez l'hébergeur, « posé à » vers l'écran de pilotage.
 *
 * Les clés d'API ne sont pas dans `VARIABLE` et ne sont donc jamais montrées :
 * ce message part dans des journaux.
 */
function diagnostic(
  erreur: z.ZodError,
  brut: Record<string, unknown>,
  posés: ReadonlySet<string>,
): string {
  return erreur.issues
    .map((issue) => {
      const champ = String(issue.path[0] ?? "");
      const nom = VARIABLE[champ];

      if (!nom) return `${champ} : ${issue.message}`;

      const recu = brut[champ];
      const provenance = posés.has(champ)
        ? `posé à « ${extrait(recu)} »`
        : recu === undefined
          ? "reçu rien"
          : `reçu « ${extrait(recu)} »`;

      return `${nom} : ${issue.message} — ${provenance}`;
    })
    .join(" ; ");
}

/** Ce que l'environnement propose, tel quel : des chaînes, ou rien. */
function environnementBrut(): Record<string, string | undefined> {
  return {
    enabled: propre(process.env.AI_ENABLED),
    mock: propre(process.env.MOCK_AI),
    dailyCallCap: propre(process.env.AI_DAILY_CALL_CAP),
    userDailyCallCap: propre(process.env.AI_DAILY_CALL_CAP_PAR_COMPTE),
    anonymousDailyCallCap: propre(process.env.AI_DAILY_CALL_CAP_ANONYME),
    model: propre(process.env.AI_MODEL),
    maxTokens: propre(process.env.AI_MAX_TOKENS),
    fournisseur: propre(process.env.AI_FOURNISSEUR),
  };
}

/**
 * L'environnement comme défaut, les surcharges de la base par-dessus : retirer
 * une surcharge suffit à revenir au défaut.
 *
 * Seul l'empilement est validé, jamais l'environnement seul : une variable
 * manquante doit pouvoir être remplacée depuis l'écran pendant un incident.
 */
export function assemblerLaConfig(surcharges: SurchargesDeConfig = {}): ConfigIa {
  const brut: Record<string, unknown> = environnementBrut();
  const posés = new Set<string>();

  for (const [champ, valeur] of Object.entries(surcharges)) {
    if (valeur === undefined) continue;

    brut[champ] = valeur;
    posés.add(champ);
  }

  const parsed = schemaDeConfig.safeParse({
    ...brut,
    apiKey: propre(process.env.ANTHROPIC_API_KEY),
    openrouterApiKey: propre(process.env.OPENROUTER_API_KEY),
  });

  if (!parsed.success) {
    throw new ConfigIaInvalideError(
      `Configuration IA invalide — ${diagnostic(parsed.error, brut, posés)}`,
    );
  }

  return parsed.data;
}

/**
 * La configuration de l'environnement seul, utilisée par les scripts de
 * vérification. Jamais pour décider d'un appel : c'est la configuration
 * effective, surcharges comprises, qui décide.
 */
export function lireLaConfigDeLEnvironnement(): ConfigIa {
  return assemblerLaConfig();
}
