/**
 * Les échecs du paiement sont typés, pour la même raison que ceux du modèle :
 * un appelant doit distinguer « le paiement n'est pas configuré » de « Stripe a
 * refusé », et les journaux doivent porter un code stable plutôt qu'un message
 * libre.
 */
export abstract class PaiementError extends Error {
  abstract readonly code: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Une variable manque, ou ne vaut rien. Le paiement n'est pas ouvert. */
export class PaiementConfigError extends PaiementError {
  readonly code = "PAIEMENT_CONFIG";

  constructor(
    readonly variable: string,
    detail: string,
  ) {
    // i18n-ignore — message d'Error interne, destiné au journal
    super(`Configuration du paiement invalide — ${variable} : ${detail}`);
  }
}

/**
 * Une clé de production a été posée sans que la production soit demandée.
 * Empêche un aperçu de branche ou une machine de dev d'encaisser de vraies
 * cartes : les clés test et live se copient depuis la même page, et l'erreur ne
 * se verrait qu'au relevé bancaire d'un client.
 */
export class PaiementLiveNonAutoriseError extends PaiementError {
  readonly code = "PAIEMENT_LIVE_NON_AUTORISE";

  constructor() {
    super(
      // i18n-ignore — message d'Error interne, destiné au journal
      "STRIPE_SECRET_KEY est une clé de production alors que PAIEMENT_LIVE n'est pas à true. " +
        // i18n-ignore — message d'Error interne, destiné au journal
        "Le mode test est le défaut : poser une clé live demande de le dire.",
    );
  }
}

/** La signature du webhook ne correspond pas. La requête n'est pas de Stripe. */
export class SignatureInvalideError extends PaiementError {
  readonly code = "PAIEMENT_SIGNATURE";

  constructor(options?: { cause?: unknown }) {
    // i18n-ignore — message d'Error interne, destiné au journal
    super("La signature de ce webhook ne correspond pas au secret configuré.", options);
  }
}

/** Stripe a répondu quelque chose que le contrat ne prévoit pas. */
export class RapportIllisibleError extends PaiementError {
  readonly code = "PAIEMENT_RAPPORT_ILLISIBLE";

  constructor(detail: string) {
    // i18n-ignore — message d'Error interne, destiné au journal
    super(`Cet abonnement Stripe ne se lit pas : ${detail}`);
  }
}

/**
 * Un geste d'abonnement a été demandé sur un compte qui n'en a pas : un onglet
 * en retard, pas une faute de l'utilisateur.
 */
export class AucunAbonnementError extends PaiementError {
  readonly code = "PAIEMENT_AUCUN_ABONNEMENT";

  constructor() {
    // i18n-ignore — message d'Error interne, destiné au journal
    super("Ce compte n'a pas d'abonnement en cours.");
  }
}

/**
 * Un achat a été demandé sur un compte qui a déjà un abonnement vivant. L'écran
 * cache le bouton, mais un onglet en retard ou un second clic y mènent, et payer
 * deux fois ferait deux abonnements.
 */
export class AbonnementDejaOuvertError extends PaiementError {
  readonly code = "PAIEMENT_ABONNEMENT_DEJA_OUVERT";

  constructor(abonnementId: string) {
    // i18n-ignore — message d'Error interne, destiné au journal
    super(`Ce compte a déjà l'abonnement ${abonnementId}.`);
  }
}

/**
 * Le portail a été demandé pour un compte qui n'a jamais approché le paiement,
 * donc sans client chez Stripe. L'écran ne propose pas le lien dans ce cas.
 */
export class AucunDossierStripeError extends PaiementError {
  readonly code = "PAIEMENT_AUCUN_DOSSIER";

  constructor() {
    // i18n-ignore — message d'Error interne, destiné au journal
    super("Ce compte n'a pas de dossier chez Stripe.");
  }
}

/**
 * Cet objet Stripe a-t-il disparu — ou n'a-t-il jamais existé dans ce mode ?
 *
 * Test et production sont deux jeux de données étanches : un identifiant écrit
 * en base sous une clé de test échoue en `resource_missing` sous une clé de
 * production, comme un objet supprimé depuis le tableau de bord. Dans les deux
 * cas l'identifiant est à remplacer ou oublier ; réessayer ne sert à rien.
 */
export function objetIntrouvableChezStripe(erreur: unknown): boolean {
  return (
    erreur !== null &&
    typeof erreur === "object" &&
    "code" in erreur &&
    erreur.code === "resource_missing"
  );
}
