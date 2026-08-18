import { z } from "zod";
import { AIConfigError } from "./errors";

/**
 * Les garde-fous, lus et validés à chaque appel plutôt qu'au chargement du
 * module : couper les appels doit prendre effet tout de suite, sans redémarrage.
 */

/**
 * Un booléen tel qu'il arrive : « true » quand il vient de l'environnement,
 * `true` quand il vient de la base. On le normalise avant de valider plutôt que
 * d'accepter une union, pour qu'un refus continue de nommer les deux valeurs
 * attendues au lieu de rendre « Invalid input ».
 */
const booleen = z.preprocess(
  (valeur) => (typeof valeur === "boolean" ? String(valeur) : valeur),
  z.enum(["true", "false"]).transform((value) => value === "true"),
);

const configSchema = z.object({
  enabled: booleen,
  mock: booleen,
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

/** Ce qu'une surcharge peut porter. Une clé absente laisse l'environnement. */
export type SurchargesDeConfig = Partial<Omit<AiConfig, "apiKey">>;

/**
 * Les trois variables qui portent un plafond, à part des autres.
 *
 * À part parce qu'elles sortent d'ici : une alerte de plafond nomme la variable
 * à changer, et une seconde table de correspondance ailleurs finirait par
 * désigner un nom qui n'existe plus. Les clés sont littérales, donc un champ
 * inventé ne compile pas.
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
};

/** Le nom de la variable derrière un plafond, pour qui doit le changer. */
export function variableDuPlafond(champ: keyof typeof VARIABLE_DE_PLAFOND): string {
  return VARIABLE_DE_PLAFOND[champ];
}

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
function extrait(valeur: unknown): string {
  const texte = String(valeur);

  return texte.length > 60 ? `${texte.slice(0, 60)}…` : texte;
}

/**
 * Ce qui a été refusé, ce qui avait été reçu, et d'où ça venait.
 *
 * Le message dit la variable et la valeur, parce que « expected one of
 * "true"|"false" » sans la valeur laisse chercher : on lit la bonne valeur dans
 * l'interface de l'hébergeur, on la croit juste, et on ne voit pas l'espace ou
 * le commentaire qui la suit. La montrer transforme une soirée en dix secondes.
 *
 * La provenance compte autant depuis qu'une surcharge peut remplacer
 * l'environnement : « reçu rien » envoie chez l'hébergeur, « posé à 0 » envoie
 * dans l'écran de pilotage. Se tromper de destination coûte la même soirée.
 *
 * `ANTHROPIC_API_KEY` n'est pas dans la table et n'a donc jamais de valeur
 * montrée — un message d'erreur part dans des journaux qu'on partage.
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
  };
}

/**
 * L'environnement, ce que la base pose par-dessus, et le tout validé d'un seul
 * tenant.
 *
 * L'ordre est le sens de la règle : l'environnement est la valeur par défaut, la
 * base est l'exception qu'on assume. Retirer une surcharge suffit donc à revenir
 * au défaut, sans avoir à se souvenir de ce qu'il valait.
 *
 * Ce qui est validé, c'est le résultat de l'empilement et lui seul. La version
 * précédente validait l'environnement d'abord, puis lui appliquait les
 * surcharges : une variable manquante levait donc avant que la surcharge censée
 * la remplacer ait eu la parole. L'échappatoire prévue pour les incidents ne
 * fonctionnait pas dans l'incident — poser la valeur depuis l'écran ne
 * rattrapait rien, il fallait passer par l'hébergeur et redéployer.
 */
export function assemblerLaConfig(surcharges: SurchargesDeConfig = {}): AiConfig {
  const brut: Record<string, unknown> = environnementBrut();
  const posés = new Set<string>();

  for (const [champ, valeur] of Object.entries(surcharges)) {
    if (valeur === undefined) continue;

    brut[champ] = valeur;
    posés.add(champ);
  }

  const parsed = configSchema.safeParse({
    ...brut,
    apiKey: propre(process.env.ANTHROPIC_API_KEY),
  });

  if (!parsed.success) {
    throw new AIConfigError(`Configuration IA invalide — ${diagnostic(parsed.error, brut, posés)}`);
  }

  return parsed.data;
}

/**
 * La configuration que l'environnement donne à lui seul.
 *
 * Sert à comparer — l'écran de pilotage montre ce défaut à côté de ce qui est
 * posé — jamais à décider d'un appel. Ce qui décide, c'est la configuration
 * effective, surcharges comprises.
 */
export function readAiConfig(): AiConfig {
  return assemblerLaConfig();
}
