import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { MENTION_FRANCHISE } from "@/lib/domain/mention-de-tva";
import { PRIX_ANNUEL, PRIX_MENSUEL } from "@/lib/domain/prix";
import { abonnementVivant, type CadenceStripe } from "@/lib/domain/rapport-de-stripe";
import { ouvrirLePaiement } from "@/lib/paiement/achat";
import { CLE_DU_PRIX, prixDeLaCadence } from "@/lib/paiement/catalogue";
import { stripe } from "@/lib/paiement/client";
import { lireConfigDePaiement } from "@/lib/paiement/config";
import { clientStripeDuCompte } from "@/lib/paiement/dossier-client";
import { fermerLAbonnementDuCompte } from "@/lib/paiement/fermeture-du-compte";
import { ouvrirLePortail } from "@/lib/paiement/portail";
import { lireLeRapport } from "@/lib/paiement/rapport";
import { arreterLAbonnement, reprendreLAbonnement } from "@/lib/paiement/resiliation";
import { comparerAvecStripe } from "./cases/etat-du-paiement";
import { conclure, record } from "./cases/journal";

/**
 * Le parcours de paiement, exercé contre le vrai Stripe en mode test.
 *
 * Ce que les tests unitaires ne peuvent pas prouver : que le catalogue répond,
 * que la session Checkout s'ouvre, que le webhook signé par Stripe traverse
 * notre route, et que ce qui en ressort atterrit dans la bonne colonne. Tout
 * cela tient à des formes d'objets et à des secrets qu'aucune fixture ne
 * vérifie — la seule preuve est un aller-retour réel.
 *
 * Il faut un tunnel ouvert dans un autre terminal, sans quoi rien ne revient :
 *
 *   stripe listen --forward-to localhost:3000/api/paiement/webhook
 *
 * Puis, dans l'ordre :
 *
 *   npm run eprouver:paiement -- ouvrir --compte=moi@exemple.fr
 *   (payer avec 4242 4242 4242 4242, une date future, n'importe quel CVC)
 *   npm run eprouver:paiement -- etat --compte=moi@exemple.fr
 *   npm run eprouver:paiement -- portail --compte=moi@exemple.fr
 *   npm run eprouver:paiement -- arreter --compte=moi@exemple.fr
 *   npm run eprouver:paiement -- reprendre --compte=moi@exemple.fr
 *   npm run eprouver:paiement -- nettoyer --compte=moi@exemple.fr
 */

const GESTES = ["ouvrir", "etat", "portail", "arreter", "reprendre", "nettoyer"] as const;

type Geste = (typeof GESTES)[number];

type Compte = { id: string; email: string; name: string };

/**
 * Ce script crée des objets chez Stripe et écrit en base. Les deux sont sans
 * conséquence en test, et aucun des deux ne l'est en production — d'où ce refus,
 * qui double celui de `lireConfigDePaiement` : lui protège la clé, celui-ci
 * protège le geste.
 */
function refuserLaProduction(): void {
  if (lireConfigDePaiement().live) {
    throw new Error("Ce script n'a rien à faire en production. Retire PAIEMENT_LIVE.");
  }
}

function lireLeGeste(): Geste {
  const donne = process.argv[2];
  const geste = GESTES.find((connu) => connu === donne);

  if (!geste) {
    throw new Error(`Geste attendu parmi ${GESTES.join(", ")}, reçu « ${donne ?? "rien"} ».`);
  }

  return geste;
}

function lireLOption(nom: string): string | undefined {
  const prefixe = `--${nom}=`;

  return process.argv.find((argument) => argument.startsWith(prefixe))?.slice(prefixe.length);
}

async function lireLeCompte(): Promise<Compte> {
  const email = lireLOption("compte");

  if (!email) throw new Error("Il faut nommer le compte : --compte=adresse@exemple.fr");

  const compte = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (!compte) throw new Error(`Aucun compte ne porte l'adresse ${email}.`);

  return compte;
}

/** Ce que le script achète, faute d'indication contraire : la cadence la plus courante. */
function lireLaCadence(): CadenceStripe {
  return process.argv.includes("--annuel") ? "year" : "month";
}

/**
 * Ouvre un paiement, et rend l'adresse où le finir à la main.
 *
 * Le tunnel Checkout ne se traverse pas en ligne de commande, et c'est voulu :
 * la saisie de carte est chez Stripe. Le script s'arrête donc au seuil et rend
 * l'adresse — c'est le navigateur qui fait le reste, comme pour une vraie
 * personne.
 */
async function ouvrir(compte: Compte): Promise<void> {
  const cadence = lireLaCadence();
  const annonce = cadence === "month" ? PRIX_MENSUEL : PRIX_ANNUEL;
  const prix = await prixDeLaCadence(cadence);

  record(
    "Le catalogue résout la cadence par sa clé, au montant annoncé",
    true,
    `${CLE_DU_PRIX[cadence]} → ${prix}, ${annonce} €`,
  );

  const clientId = await clientStripeDuCompte(compte);
  const client = await stripe().customers.retrieve(clientId);
  const pied = "deleted" in client ? null : client.invoice_settings.footer;

  record(
    "Le client Stripe porte la mention de franchise en base",
    pied === MENTION_FRANCHISE,
    `${clientId} → ${pied ?? "aucun pied de facture"}`,
  );

  const adresse = await ouvrirLePaiement(compte, cadence);

  record("La session Checkout s'ouvre", adresse.startsWith("https://"), adresse);

  console.info(`\nPayer ici, avec la carte 4242 4242 4242 4242 :\n${adresse}\n`);
}

/**
 * Ouvre le portail, et vérifie qu'il ne propose que ce qu'on lui a laissé.
 *
 * Le partage des gestes est une décision de produit — résilier dans Kairn, la
 * carte chez Stripe — et elle vit dans un objet de configuration qui dort chez
 * eux. Rien dans le dépôt ne garantit qu'il n'a pas été modifié depuis le
 * tableau de bord : seule une lecture le dit.
 */
async function portail(compte: Compte): Promise<void> {
  const adresse = await ouvrirLePortail(compte.id);

  record("Le portail s'ouvre pour ce compte", adresse.startsWith("https://"), adresse);

  const configurations = await stripe().billingPortal.configurations.list({
    active: true,
    limit: 100,
  });
  const notre = configurations.data.find((c) => c.metadata?.projet === "portail-kairn");

  if (!notre) {
    record("Une configuration porte notre marque", false, "aucune trouvée");

    return;
  }

  const f = notre.features;

  record(
    "Le portail montre les factures et laisse changer de carte",
    f.invoice_history.enabled && f.payment_method_update.enabled,
    `factures ${f.invoice_history.enabled}, carte ${f.payment_method_update.enabled}`,
  );

  record(
    "Le portail ne résilie ni ne change d'offre — ces gestes restent dans Kairn",
    !f.subscription_cancel.enabled && !f.subscription_update.enabled,
    `résiliation ${f.subscription_cancel.enabled}, changement d'offre ${f.subscription_update.enabled}`,
  );

  console.info(`
Le portail est ici :
${adresse}
`);
}

async function main(): Promise<string> {
  refuserLaProduction();

  const geste = lireLeGeste();
  const compte = await lireLeCompte();

  switch (geste) {
    case "ouvrir":
      await ouvrir(compte);

      return "Le paiement est ouvert. Finis-le dans le navigateur, puis relance avec « etat ».";

    case "etat":
      await comparerAvecStripe(compte.id);

      return "Notre ligne et celle de Stripe disent la même chose.";

    case "portail":
      await portail(compte);

      return "Le portail s'ouvre, et n'ouvre que ce qu'on lui laisse.";

    case "arreter":
      await arreterLAbonnement(compte.id);
      await comparerAvecStripe(compte.id);

      return "L'abonnement est arrêté, et court jusqu'à son terme.";

    case "reprendre":
      await reprendreLAbonnement(compte.id);
      await comparerAvecStripe(compte.id);

      return "L'abonnement est repris.";

    case "nettoyer":
      await nettoyer(compte.id);

      return "Le compte est revenu à l'offre gratuite.";
  }
}

/**
 * Efface les traces de l'épreuve.
 *
 * L'abonnement est annulé **tout de suite** et non à son terme : un abonnement
 * de test qui court, c'est une facture par mois et autant de webhooks dans les
 * journaux, pour un compte dont plus personne ne s'occupe. Le client Stripe,
 * lui, reste — il ne coûte rien, il porte l'historique, et le code sait le
 * retrouver.
 */
async function nettoyer(userId: string): Promise<void> {
  const ligne = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeSubscriptionId: true },
  });

  if (ligne?.stripeSubscriptionId) {
    // La fonction de production, et non un `cancel` écrit pour l'occasion :
    // c'est elle qui coupe l'abonnement quand un compte est supprimé, et c'est
    // le seul endroit où elle s'exerce contre un vrai abonnement.
    await fermerLAbonnementDuCompte(userId);

    const apres = await stripe().subscriptions.retrieve(ligne.stripeSubscriptionId);

    record(
      "La fermeture coupe l'abonnement chez Stripe, tout de suite",
      !abonnementVivant(lireLeRapport(apres).statut),
      `${ligne.stripeSubscriptionId} → ${apres.status}`,
    );
  }

  await prisma.subscription.updateMany({
    where: { userId },
    data: {
      plan: "GRATUIT",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
      stripeEventAt: null,
    },
  });

  record("La ligne est revenue à son état d'origine", true, "plan GRATUIT, aucun terme");
}

main()
  .then(conclure)
  .catch((erreur: unknown) => {
    console.error("L'épreuve a échoué.", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
