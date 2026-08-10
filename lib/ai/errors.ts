/**
 * Les échecs d'appel modèle sont typés : un appelant doit pouvoir distinguer
 * « le produit a coupé les appels » de « le modèle a mal répondu », et les
 * journaux doivent porter un code stable plutôt qu'un message libre.
 */
export abstract class AiError extends Error {
  abstract readonly code: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** `AI_ENABLED=false`. Aucun appel n'est émis, aucune ligne n'est écrite. */
export class AIDisabledError extends AiError {
  readonly code = "AI_DISABLED";

  constructor() {
    super("Les appels au modèle sont coupés (AI_ENABLED=false).");
  }
}

/** Plafond journalier atteint. Vérifié avant l'émission, jamais après. */
export class AIQuotaError extends AiError {
  readonly code = "AI_QUOTA";

  constructor(
    readonly used: number,
    readonly cap: number,
  ) {
    super(`Plafond d'appels du jour atteint : ${used}/${cap}.`);
  }
}

/**
 * La sortie du modèle ne respecte pas le schéma. Elle n'est pas réparée — mais
 * elle est conservée telle quelle dans `raw` : sans elle, on diagnostique une
 * anomalie de génération à l'aveugle.
 */
export class AIInvalidOutputError extends AiError {
  readonly code = "AI_INVALID_OUTPUT";

  constructor(
    readonly purpose: string,
    readonly issues: string[],
    readonly raw: string = "",
  ) {
    super(`Sortie invalide pour « ${purpose} » : ${issues.join(" ; ")}`);
  }
}

/**
 * La réponse a été coupée par `max_tokens`. Le bloc d'outil est peut-être
 * présent et syntaxiquement valide, mais incomplet : c'est un échec, pas un
 * succès partiel. Relever `AI_MAX_TOKENS` plutôt que rejouer à l'identique.
 */
export class AITruncatedOutputError extends AiError {
  readonly code = "AI_TRUNCATED";

  constructor(
    readonly purpose: string,
    readonly maxTokens: number,
  ) {
    super(`Sortie tronquée pour « ${purpose} » : la limite de ${maxTokens} tokens a été atteinte.`);
  }
}

/** Le modèle n'a rien rendu là où la sortie structurée devait arriver. */
export class AIMissingOutputError extends AiError {
  readonly code = "AI_NO_OUTPUT";

  constructor(readonly purpose: string) {
    super(`Le modèle n'a produit aucun texte pour « ${purpose} ».`);
  }
}

/** Le mode mock est actif mais la fixture est absente ou illisible. */
export class AIFixtureMissingError extends AiError {
  readonly code = "AI_FIXTURE_MISSING";

  constructor(readonly purpose: string) {
    super(`Aucune fixture pour « ${purpose} » dans lib/ai/fixtures/.`);
  }
}

/** L'appel réseau a échoué. Aucun retry : l'échec est enregistré tel quel. */
export class AICallFailedError extends AiError {
  readonly code = "AI_CALL_FAILED";

  constructor(
    readonly purpose: string,
    cause: unknown,
  ) {
    super(`L'appel au modèle a échoué pour « ${purpose} ».`, { cause });
  }
}

/** Une variable d'environnement des garde-fous est absente ou invalide. */
export class AIConfigError extends AiError {
  readonly code = "AI_CONFIG";
}

/**
 * Une forme ne se traduit pas en schéma de sortie.
 *
 * Levée avant d'émettre, jamais après : perdre en silence un mot-clé qui décide
 * de ce que le modèle a le droit d'écrire, c'est se retrouver un jour avec une
 * énumération qui n'en est plus une, sans rien pour l'expliquer.
 */
export class AISchemaError extends AiError {
  readonly code = "AI_SCHEMA";

  constructor(
    readonly motCle: string,
    readonly chemin: string,
  ) {
    super(
      `Le schéma de sortie ne sait pas traduire « ${motCle} » (chemin : ${chemin}).` +
        " Rétrograder une contrainte de structure en description la ferait disparaître.",
    );
  }
}
