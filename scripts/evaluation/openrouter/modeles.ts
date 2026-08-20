/**
 * Les modèles de la campagne, avec leur identifiant OpenRouter et leur prix
 * catalogue. Un seul endroit à corriger si l'identifiant change ou si un
 * nouveau modèle entre dans la liste — le reste du banc lit ces constantes.
 *
 * Prix en dollars par million de tokens, catalogue OpenRouter. Le cache de
 * prompt ne traverse pas les fournisseurs (voir §1 de la fiche) : les
 * challengers paient leur entrée plein tarif, la colonne Sonnet 5 (déjà
 * payée) tournait à 92 % de lecture au cache. Ne pas comparer les factures
 * brutes entre colonnes, seulement les prix catalogue.
 *
 * Les identifiants sont ceux du listing OpenRouter au moment de la fiche.
 * `verifierLeListing()` de `verification.ts` refuse au démarrage si l'un
 * d'eux n'existe plus ou ne supporte pas les sorties structurées.
 */

export type ModeleOpenRouter = {
  /** Nom court utilisé dans les rapports et les logs. */
  nom: string;
  /** Identifiant OpenRouter, `<fournisseur>/<slug>`. */
  id: string;
  /** Dollars par million de tokens d'entrée, prix catalogue. */
  prixInParM: number;
  /** Dollars par million de tokens de sortie, prix catalogue. */
  prixOutParM: number;
  /** La lignée du modèle, sert à empêcher un juge de sa propre famille. */
  lignee: "anthropic" | "google" | "openai" | "mistral" | "deepseek" | "qwen" | "minimax";
};

/**
 * La colonne de référence, déjà payée par la confirmation du figé
 * 2026-08-20-11h58. Présente ici pour que le rapport de campagne sache
 * quel prix et quelle lignée porter en tête, sans dépendre de la config de
 * production. Sert aussi de borne au filtre du helper `--lister` : tout ce
 * qui coûte plus cher que la référence est hors sujet.
 */
export const REFERENCE: ModeleOpenRouter = {
  nom: "Sonnet 5",
  id: "anthropic/claude-sonnet-5",
  prixInParM: 3,
  prixOutParM: 15,
  lignee: "anthropic",
};

/**
 * Les quatre challengers de la campagne 1 (extraction), voir §2 de la fiche.
 * **À désigner par le pilote** sur la sortie de `npm run verifier:openrouter --
 * --lister` : la fiche avait posé des identifiants et des prix plausibles, le
 * listing OpenRouter les a démentis. Chaque challenger doit couvrir une
 * lignée différente et le total doit tenir deux paliers de prix.
 */
export const CHALLENGERS: ModeleOpenRouter[] = [];

/**
 * Le juge candidat, cinquième lignée : ni Anthropic, ni Google, ni OpenAI,
 * ni Mistral — sinon il note sa propre famille. Voir §3 de la fiche. **À
 * désigner par le pilote** sur la sortie du helper de listing. Celui qui
 * passera la validation sur les six témoins connus deviendra le juge de
 * toute la campagne.
 */
export const JUGES_CANDIDATS: ModeleOpenRouter[] = [];
