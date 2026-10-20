/**
 * Typés pour qu'un appelant distingue « appels coupés » de « mauvaise réponse »,
 * et que les journaux portent un code stable plutôt qu'un message libre.
 */
export abstract class AppelModeleError extends Error {
  abstract readonly code: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** `AI_ENABLED=false`. Aucun appel n'est émis, aucune ligne n'est écrite. */
export class AppelsCoupesError extends AppelModeleError {
  readonly code = "AI_DISABLED";

  constructor() {
    super("Les appels au modèle sont coupés (AI_ENABLED=false).");
  }
}

/**
 * Plafond journalier global atteint, vérifié avant l'émission. Un report, pas un
 * échec : le même travail réussira demain, `executerLeJob` la traite à part.
 */
export class PlafondGlobalAtteintError extends AppelModeleError {
  readonly code = "AI_QUOTA";

  constructor(
    readonly used: number,
    readonly cap: number,
  ) {
    super(`Plafond d'appels du jour atteint : ${used}/${cap}.`);
  }
}

/** « Tu es plein », quand le plafond global dit « le produit est plein » et se reporte. */
export class PartDuCompteEpuiseeError extends AppelModeleError {
  readonly code = "AI_USER_QUOTA";

  constructor(
    readonly used: number,
    readonly cap: number,
  ) {
    super(`Part d'appels du jour atteinte pour ce compte : ${used}/${cap}.`);
  }
}

/**
 * Part du jour épuisée pour le trafic sans compte. Pas une sous-classe de
 * `PlafondGlobalAtteintError`, dont le report laisserait le visiteur attendre sans
 * fin : le dépôt part en `FAILED`, une panne qui ne consomme pas d'essai.
 */
export class PartSansCompteEpuiseeError extends AppelModeleError {
  readonly code = "AI_ANONYMOUS_QUOTA";

  constructor(
    readonly used: number,
    readonly cap: number,
  ) {
    super(`Part d'appels du jour atteinte pour les essais sans compte : ${used}/${cap}.`);
  }
}

/** Sortie hors schéma : jamais réparée, conservée dans `raw` pour le diagnostic. */
export class SortieInvalideError extends AppelModeleError {
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
 * Coupée par `max_tokens` : peut-être valide mais incomplète, donc un échec.
 *
 * Ne pas relever `AI_MAX_TOKENS` pour autant. Un appel rend ~1 800 jetons (8 400
 * au plus) ; les troncatures mesurées ont tapé les 10 000, sur deux modèles : une
 * génération en vrille, qui brûlerait plus et déborderait les 60 s du cron.
 * `scinderApresTroncature` coupe le groupe en deux ; le plafond ne se relève que
 * pour un concept seul, que `scinderLeGroupe` ne sait pas traiter.
 */
export class SortieTronqueeError extends AppelModeleError {
  readonly code = "AI_TRUNCATED";

  constructor(
    readonly purpose: string,
    readonly maxTokens: number,
  ) {
    super(`Sortie tronquée pour « ${purpose} » : la limite de ${maxTokens} tokens a été atteinte.`);
  }
}

/** Le modèle n'a rien rendu là où la sortie structurée devait arriver. */
export class SortieAbsenteError extends AppelModeleError {
  readonly code = "AI_NO_OUTPUT";

  constructor(readonly purpose: string) {
    super(`Le modèle n'a produit aucun texte pour « ${purpose} ».`);
  }
}

/** Le mode mock est actif mais la fixture est absente ou illisible. */
export class FixtureAbsenteError extends AppelModeleError {
  readonly code = "AI_FIXTURE_MISSING";

  constructor(readonly purpose: string) {
    super(`Aucune fixture pour « ${purpose} » dans lib/ai/fixtures/.`);
  }
}

/** L'appel réseau a échoué. Aucun retry : l'échec est enregistré tel quel. */
export class EmissionEchoueeError extends AppelModeleError {
  readonly code = "AI_CALL_FAILED";

  constructor(
    readonly purpose: string,
    cause: unknown,
  ) {
    super(`L'appel au modèle a échoué pour « ${purpose} ».`, { cause });
  }
}

/** Une variable d'environnement des garde-fous est absente ou invalide. */
export class ConfigIaInvalideError extends AppelModeleError {
  readonly code = "AI_CONFIG";
}

/**
 * Levée avant d'émettre : perdre en silence un mot-clé contraignant (une
 * énumération) laisserait la sortie sans contrainte.
 */
export class SchemaIntraduisibleError extends AppelModeleError {
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
