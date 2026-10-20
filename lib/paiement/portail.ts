import { ROUTES } from "@/lib/auth/routes";
import { lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { adresseDeLApp } from "@/lib/site/adresse-de-lapp";
import { ORIGINE_DU_SITE } from "@/lib/site/origine";
import { stripe } from "./client";
import { lireConfigDePaiement } from "./config";
import { AucunDossierStripeError, objetIntrouvableChezStripe } from "./erreurs";

/**
 * Factures et carte : des écrans rares que Stripe tient à jour. Arrêter et
 * reprendre restent dans Kairn : résilier sur un site tiers, c'est dur à quitter.
 */

/** Comme les `lookup_key` : l'id change entre test et production, la métadonnée non. */
const MARQUE = "portail-kairn";

/** Indexé par la clé : un passage en production ne réutilise jamais celle du test. */
let cache: { cle: string; configuration: string } | null = null;

/** Écrite ici, pas au tableau de bord : ce que le produit délègue se relit dans le code. */
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
      // Dans Kairn, qui sait dire ce que ça change pour le compte.
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
      // L'adresse est l'identité de connexion : changée d'un seul côté, elle
      // casserait le rattachement.
      customer_update: { enabled: false },
    },
  });
}

/**
 * Le dossier vient de notre base, jamais du navigateur. Sans dossier l'écran
 * n'offre pas le lien : l'erreur ne vient que d'un onglet en retard.
 */
export async function ouvrirLePortail(userId: string): Promise<string> {
  const { clientId } = await lireDossierStripe(userId);

  if (!clientId) throw new AucunDossierStripeError();

  try {
    return await sessionDePortail(clientId);
  } catch (erreur) {
    // Dossier d'un autre mode ou supprimé : rien à montrer, le prochain achat en ouvre un.
    if (objetIntrouvableChezStripe(erreur)) throw new AucunDossierStripeError();

    throw erreur;
  }
}

async function sessionDePortail(clientId: string): Promise<string> {
  const session = await stripe().billingPortal.sessions.create({
    customer: clientId,
    configuration: await configurationDuPortail(),
    locale: "fr",
    // Rien à relire au retour : ce qui toucherait un droit passe par le webhook.
    return_url: `${adresseDeLApp()}${ROUTES.reglages}`,
  });

  return session.url;
}
