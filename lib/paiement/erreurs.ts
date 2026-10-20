/**
 * Typés : l'appelant distingue « pas configuré » de « Stripe a refusé », et le
 * journal porte un code stable.
 */
export abstract class PaiementError extends Error {
  abstract readonly code: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

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
 * Empêche un aperçu de branche ou un poste de dev d'encaisser : test et live se
 * copient depuis la même page, l'erreur ne se verrait qu'au relevé d'un client.
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

export class SignatureInvalideError extends PaiementError {
  readonly code = "PAIEMENT_SIGNATURE";

  constructor(options?: { cause?: unknown }) {
    // i18n-ignore — message d'Error interne, destiné au journal
    super("La signature de ce webhook ne correspond pas au secret configuré.", options);
  }
}

export class RapportIllisibleError extends PaiementError {
  readonly code = "PAIEMENT_RAPPORT_ILLISIBLE";

  constructor(detail: string) {
    // i18n-ignore — message d'Error interne, destiné au journal
    super(`Cet abonnement Stripe ne se lit pas : ${detail}`);
  }
}

/** Un onglet en retard, pas une faute de l'utilisateur. */
export class AucunAbonnementError extends PaiementError {
  readonly code = "PAIEMENT_AUCUN_ABONNEMENT";

  constructor() {
    // i18n-ignore — message d'Error interne, destiné au journal
    super("Ce compte n'a pas d'abonnement en cours.");
  }
}

/** L'écran cache le bouton, mais un onglet en retard ou un second clic ferait deux abonnements. */
export class AbonnementDejaOuvertError extends PaiementError {
  readonly code = "PAIEMENT_ABONNEMENT_DEJA_OUVERT";

  constructor(abonnementId: string) {
    // i18n-ignore — message d'Error interne, destiné au journal
    super(`Ce compte a déjà l'abonnement ${abonnementId}.`);
  }
}

/** L'écran ne propose pas le portail dans ce cas. */
export class AucunDossierStripeError extends PaiementError {
  readonly code = "PAIEMENT_AUCUN_DOSSIER";

  constructor() {
    // i18n-ignore — message d'Error interne, destiné au journal
    super("Ce compte n'a pas de dossier chez Stripe.");
  }
}

/**
 * Supprimé, ou d'un autre mode : test et production sont étanches, un id de test
 * échoue en `resource_missing` sous une clé live. Réessayer ne sert à rien.
 */
export function objetIntrouvableChezStripe(erreur: unknown): boolean {
  return (
    erreur !== null &&
    typeof erreur === "object" &&
    "code" in erreur &&
    erreur.code === "resource_missing"
  );
}
