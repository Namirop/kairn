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
    super(`Configuration du paiement invalide — ${variable} : ${detail}`);
  }
}

/**
 * Une clé de production a été posée sans que la production soit demandée.
 *
 * C'est le garde-fou qui empêche un aperçu de branche ou une machine de
 * développement d'encaisser de vraies cartes. Il n'a rien de théorique : la
 * clé test et la clé live se ressemblent, elles se copient depuis la même page,
 * et l'erreur ne se voit qu'au premier relevé bancaire d'un client.
 */
export class PaiementLiveNonAutoriseError extends PaiementError {
  readonly code = "PAIEMENT_LIVE_NON_AUTORISE";

  constructor() {
    super(
      "STRIPE_SECRET_KEY est une clé de production alors que PAIEMENT_LIVE n'est pas à true. " +
        "Le mode test est le défaut : poser une clé live demande de le dire.",
    );
  }
}

/** La signature du webhook ne correspond pas. La requête n'est pas de Stripe. */
export class SignatureInvalideError extends PaiementError {
  readonly code = "PAIEMENT_SIGNATURE";

  constructor(options?: { cause?: unknown }) {
    super("La signature de ce webhook ne correspond pas au secret configuré.", options);
  }
}

/** Stripe a répondu quelque chose que le contrat ne prévoit pas. */
export class RapportIllisibleError extends PaiementError {
  readonly code = "PAIEMENT_RAPPORT_ILLISIBLE";

  constructor(detail: string) {
    super(`Cet abonnement Stripe ne se lit pas : ${detail}`);
  }
}

/**
 * Un geste d'abonnement a été demandé sur un compte qui n'en a pas.
 *
 * Ce n'est pas une faute de l'utilisateur : c'est un écran qui a proposé
 * d'arrêter un abonnement déjà fini, ou deux onglets ouverts dont l'un est en
 * retard sur l'autre. Le message le dit sans accuser.
 */
export class AucunAbonnementError extends PaiementError {
  readonly code = "PAIEMENT_AUCUN_ABONNEMENT";

  constructor() {
    super("Ce compte n'a pas d'abonnement en cours.");
  }
}
