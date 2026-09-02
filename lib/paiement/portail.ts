import { ROUTES } from "@/lib/auth/routes";
import { lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { adresseDeLApp } from "@/lib/site/adresse-de-lapp";
import { ORIGINE_DU_SITE } from "@/lib/site/origine";
import { stripe } from "./client";
import { lireConfigDePaiement } from "./config";
import { AucunDossierStripeError, objetIntrouvableChezStripe } from "./erreurs";

/**
 * Le portail hébergé, pour les deux gestes qu'on ne construit pas.
 *
 * **On n'y envoie pas tout, et c'est le sujet de ce fichier.** Arrêter et
 * reprendre restent dans Kairn : un abonnement qu'on ne peut résilier que sur un
 * site tiers est un abonnement qu'on rend difficile à quitter, et ce produit n'a
 * pas envie d'être celui-là. Le portail reçoit les factures et le changement de
 * carte — des écrans entiers à construire et à maintenir pour un usage rare, que
 * Stripe fait mieux et tient à jour à notre place.
 *
 * Sans lui, quelqu'un dont la carte expire n'a **aucun chemin** depuis
 * l'application pour la mettre à jour : son seul recours est l'email de relance
 * de Stripe. C'est le trou que ce module ferme.
 */

/**
 * Ce qui reconnaît notre configuration parmi celles du compte.
 *
 * Même raison que les `lookup_key` du catalogue : une configuration de portail
 * porte un identifiant propre à son environnement, et l'inscrire dans le code
 * demanderait une variable d'environnement de plus, à ne pas oublier le jour de
 * la mise en production. Une marque en métadonnée est la même des deux côtés.
 */
const MARQUE = "portail-kairn";

/**
 * L'instance de configuration, gardée tant que la clé ne change pas.
 *
 * Résoudre la configuration coûte un aller-retour, parfois deux ; le portail
 * s'ouvre rarement mais il n'y a aucune raison de le payer à chaque fois. La
 * clé est dans le cache pour qu'un passage de test à production ne réutilise
 * jamais la configuration de l'autre monde.
 */
let cache: { cle: string; configuration: string } | null = null;

/**
 * Ce que le portail a le droit de faire.
 *
 * Écrit ici plutôt que réglé dans le tableau de bord : c'est la frontière entre
 * ce que le produit assume et ce qu'il délègue, et elle doit se relire dans le
 * code. Un portail dont quelqu'un cocherait « autoriser l'annulation » depuis
 * une interface d'hébergeur contredirait en silence l'écran des réglages.
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
      // Les liens publics et non l'adresse courante : la page que le portail
      // montre doit être celle du site, pas un `localhost` de développement.
      privacy_policy_url: `${ORIGINE_DU_SITE}${ROUTES.confidentialite}`,
      terms_of_service_url: `${ORIGINE_DU_SITE}${ROUTES.mentionsLegales}`,
    },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      // **Les deux refus qui font le partage.** Résilier et changer d'offre se
      // font dans Kairn, où l'on sait dire ce que ça change pour le compte —
      // le portail, lui, ne connaît que des lignes de facturation.
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
      // Rien de ce que le portail propose de modifier ici n'est à lui : l'adresse
      // du compte est l'identité de connexion, elle se change dans Kairn ou nulle
      // part. Une adresse changée d'un côté seulement casse le rattachement.
      customer_update: { enabled: false },
    },
  });
}

/**
 * Ouvre le portail pour un compte, et rend l'adresse où l'envoyer.
 *
 * Le client vient de notre ligne, jamais du client : on n'ouvre le dossier que
 * du compte de la session. Un compte qui n'a jamais approché le paiement n'a pas
 * de dossier, et rien à voir dans un portail — l'écran ne lui propose donc pas
 * le lien, et cette erreur ne devrait se rencontrer qu'en cas d'onglet en retard.
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
    // On revient là d'où l'on est parti. Le portail n'a rien à nous apprendre au
    // retour : ce qu'il change — une carte, rien d'autre — ne touche à aucun
    // droit, et ce qui toucherait à un droit passerait par un webhook.
    return_url: `${adresseDeLApp()}${ROUTES.reglages}`,
  });

  return session.url;
}
