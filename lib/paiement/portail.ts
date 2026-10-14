import { ROUTES } from "@/lib/auth/routes";
import { lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { adresseDeLApp } from "@/lib/site/adresse-de-lapp";
import { ORIGINE_DU_SITE } from "@/lib/site/origine";
import { stripe } from "./client";
import { lireConfigDePaiement } from "./config";
import { AucunDossierStripeError, objetIntrouvableChezStripe } from "./erreurs";

/**
 * Le portail hébergé de Stripe, pour les factures et le changement de carte :
 * des écrans rares que Stripe tient à jour à notre place.
 *
 * Arrêter et reprendre restent dans Kairn : un abonnement qu'on ne peut
 * résilier que sur un site tiers est un abonnement difficile à quitter.
 */

/**
 * Ce qui reconnaît notre configuration parmi celles du compte. Comme les
 * `lookup_key` du catalogue : l'identifiant d'une configuration change entre
 * test et production, une marque en métadonnée est la même des deux côtés.
 */
const MARQUE = "portail-kairn";

/**
 * La configuration résolue, gardée tant que la clé ne change pas : un passage
 * de test à production ne doit jamais réutiliser celle de l'autre mode.
 */
let cache: { cle: string; configuration: string } | null = null;

/**
 * Ce que le portail a le droit de faire, écrit ici plutôt que réglé dans le
 * tableau de bord Stripe : la frontière entre ce que le produit assume et ce
 * qu'il délègue doit se relire dans le code.
 */
async function configurationDuPortail(): Promise<string> {
  const { cleSecrete } = lireConfigDePaiement();

  if (cache?.cle === cleSecrete) return cache.configuration;

  const existantes = await stripe().billingPortal.configurations.list({ active: true, limit: 100 });
  const notre = existantes.data.find((configuration) => configuration.metadata?.projet === MARQUE);
  const configuration = notre ?? (await creerLaConfiguration());

  cache = { cle: cleSecrete, configuration: configuration.id };

  return configuration.id;
}

async function creerLaConfiguration() {
  return stripe().billingPortal.configurations.create({
    metadata: { projet: MARQUE },
    business_profile: {
      // Les liens publics, jamais un `localhost` de développement.
      privacy_policy_url: `${ORIGINE_DU_SITE}${ROUTES.confidentialite}`,
      terms_of_service_url: `${ORIGINE_DU_SITE}${ROUTES.mentionsLegales}`,
    },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      // Résilier et changer d'offre se font dans Kairn, qui sait dire ce que
      // ça change pour le compte.
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
      // L'adresse du compte est l'identité de connexion : changée d'un côté
      // seulement, elle casserait le rattachement.
      customer_update: { enabled: false },
    },
  });
}

/**
 * Ouvre le portail pour un compte, et rend l'adresse où l'envoyer.
 *
 * Le dossier Stripe vient de notre base, jamais du navigateur. Sans dossier,
 * l'écran ne propose pas le lien : l'erreur ne se rencontre qu'avec un onglet
 * en retard.
 */
export async function ouvrirLePortail(userId: string): Promise<string> {
  const { clientId } = await lireDossierStripe(userId);

  if (!clientId) throw new AucunDossierStripeError();

  try {
    return await sessionDePortail(clientId);
  } catch (erreur) {
    // Le dossier date d'un autre mode, ou a été supprimé : il n'a ni facture ni
    // carte à montrer. Le prochain achat en ouvrira un neuf.
    if (objetIntrouvableChezStripe(erreur)) throw new AucunDossierStripeError();

    throw erreur;
  }
}

async function sessionDePortail(clientId: string): Promise<string> {
  const session = await stripe().billingPortal.sessions.create({
    customer: clientId,
    configuration: await configurationDuPortail(),
    locale: "fr",
    // Le retour n'a rien à relire : le portail ne change qu'une carte, et ce
    // qui toucherait à un droit passerait par un webhook.
    return_url: `${adresseDeLApp()}${ROUTES.reglages}`,
  });

  return session.url;
}
