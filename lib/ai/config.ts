import { z } from "zod";
import { ConfigIaInvalideError } from "./errors";
import type { Fournisseur } from "./fournisseurs";

/** Lus à chaque appel, pas au chargement : couper les appels prend effet sans redémarrage. */

/**
 * « true » de l'environnement, `true` de la base. Normalisé plutôt qu'en union,
 * pour qu'un refus nomme les valeurs attendues au lieu de « Invalid input ».
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
  /** `openrouter` exige `OPENROUTER_API_KEY`, distincte de la clé du banc. */
  fournisseur: z
    .enum(["anthropic", "openrouter"] as const satisfies readonly Fournisseur[])
    .default("anthropic"),
  openrouterApiKey: z.string().min(1).optional(),
});

export type ConfigIa = z.infer<typeof schemaDeConfig>;

/** Ce qu'une surcharge peut porter. Une clé absente laisse l'environnement. */
export type SurchargesDeConfig = Partial<Omit<ConfigIa, "apiKey">>;

/** À part car l'alerte de plafond nomme la variable à changer : une seconde table divergerait. */
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

export function variableDuPlafond(champ: keyof typeof VARIABLE_DE_PLAFOND): string {
  return VARIABLE_DE_PLAFOND[champ];
}

/**
 * L'interface d'un hébergeur, contrairement à `dotenv`, ne retire ni espaces ni
 * guillemets, et un champ effacé y laisse une chaîne vide. Un `# …` final reste :
 * un `#` peut appartenir à la valeur.
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
 * Variable, valeur et provenance : sans la valeur, une espace en trop reste
 * invisible ; « reçu » envoie chez l'hébergeur, « posé à » vers l'écran de pilotage.
 * Les clés d'API, absentes de `VARIABLE`, ne sont jamais montrées : ceci part en journaux.
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
 * L'environnement, les surcharges de la base par-dessus. Seul l'empilement est
 * validé : une variable manquante doit pouvoir se remplacer depuis l'écran en incident.
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

/** Pour les scripts de vérification. Un appel se décide sur la configuration effective. */
export function lireLaConfigDeLEnvironnement(): ConfigIa {
  return assemblerLaConfig();
}
