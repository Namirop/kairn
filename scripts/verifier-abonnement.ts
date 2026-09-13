import "dotenv/config";
// Import de type seulement : effacé à la compilation, donc il ne charge rien
// avant que l'environnement soit posé, contrairement aux imports dynamiques
// qui suivent.
import type { StatutStripe } from "@/lib/domain/rapport-de-stripe";
import { conclure, record } from "./verification/journal";

/**
 * Preuve que l'abonnement ne se laisse pas remonter le temps.
 *
 * Stripe ne garantit pas l'ordre d'arrivée de ses webhooks et les rejoue :
 * `lib/domain/rapport-de-stripe.ts` énonce la règle, et Vitest prouve qu'elle
 * est juste. Ce qu'aucun test unitaire ne peut prouver, c'est qu'elle tient
 * quand deux événements sont traités **en même temps** — la garantie n'est plus
 * dans le TypeScript à ce moment-là, elle est dans le `where` d'une instruction
 * Postgres. Comme le plafond concurrent, ça demande une vraie base.
 *
 * L'enjeu est un mois payé qui disparaît sans un bruit : ni erreur, ni
 * réclamation, juste un compte retombé au plafond gratuit.
 *
 *   npm run verifier:abonnement
 */

const COMPTE = "verification-abonnement";
const CLIENT = "cus_verification_kairn";
const ABONNEMENT = "sub_verification_kairn";

/** Loin devant, pour qu'aucun terme ne soit dépassé pendant la passe. */
const TERME = new Date("2999-06-01T00:00:00.000Z");
const TERME_PASSE = new Date("2000-01-01T00:00:00.000Z");

const T0 = new Date("2026-09-01T12:00:00.000Z");
const decale = (secondes: number) => new Date(T0.getTime() + secondes * 1000);

async function main(): Promise<void> {
  const { prisma } = await import("@/lib/db/client");
  const { creerCompte, effacerComptes } = await import("./verification/abus-fabrique");
  const { attacherLeClientStripe, enregistrerLEtatDeLAbonnement } =
    await import("@/lib/db/ecriture-de-labonnement");
  const { lireLOffreDuCompte } = await import("@/lib/db/abonnement");
  const { compteDuClientStripe } = await import("@/lib/db/ecriture-de-labonnement");
  const { etatDepuisStripe } = await import("@/lib/domain/rapport-de-stripe");
  // Les deux plafonds viennent de la règle, ils ne se recopient pas.
  //
  // Ils étaient écrits en clair plus bas — trente et trois cents —, et ils ont
  // été portés à cinquante et cinq cents le 04/09/2026 sans que ce fichier
  // bouge. Deux vérifications sur huit échouaient donc depuis, en annonçant un
  // défaut qui n'existait pas : un script de contrôle qui crie faux est un
  // script qu'on cesse de lancer, et c'est plus grave que de ne pas l'avoir.
  const { PLAFOND_GRATUIT, PLAFOND_PAYANT } = await import("@/lib/domain/plafond-du-plan");

  await effacerComptes([COMPTE]);
  await creerCompte(COMPTE);

  /** Un événement d'abonnement, tel que le webhook l'aurait traduit. */
  const ecrire = (statut: StatutStripe, evenementA: Date, terme = TERME) =>
    enregistrerLEtatDeLAbonnement({
      userId: COMPTE,
      etat: etatDepuisStripe({
        statut,
        cadence: "month",
        finDePeriode: terme,
        resilieALaFin: statut === "active" ? false : true,
      }),
      abonnementStripeId: ABONNEMENT,
      evenementA,
    });

  try {
    await attacherLeClientStripe(COMPTE, CLIENT);

    // ---- Le chemin nominal -------------------------------------------------
    const premier = await ecrire("active", decale(0));
    const apresAchat = await lireLOffreDuCompte(COMPTE);

    record(
      "Un abonnement actif ouvre le plan payant",
      premier === "ecrit" && apresAchat.plan === "MENSUEL" && apresAchat.plafond === PLAFOND_PAYANT,
      `${premier}, plan ${apresAchat.plan}, plafond ${apresAchat.plafond}`,
    );

    // ---- Le rejeu ----------------------------------------------------------
    const rejeu = await ecrire("canceled", decale(0));
    const apresRejeu = await lireLOffreDuCompte(COMPTE);

    record(
      "Un événement rejoué à l'identique n'écrit rien",
      rejeu === "ignore" && apresRejeu.plan === "MENSUEL",
      `${rejeu}, plan ${apresRejeu.plan}`,
    );

    // ---- L'événement en retard --------------------------------------------
    const enRetard = await ecrire("canceled", decale(-30));
    const apresRetard = await lireLOffreDuCompte(COMPTE);

    record(
      "Une résiliation arrivée après le renouvellement qu'elle précédait est ignorée",
      enRetard === "ignore" && apresRetard.plan === "MENSUEL",
      `${enRetard}, plan ${apresRetard.plan}`,
    );

    // ---- L'événement plus récent ------------------------------------------
    const suivant = await ecrire("canceled", decale(30));
    const apresSuivant = await lireLOffreDuCompte(COMPTE);

    record(
      "Un événement plus récent est appliqué",
      suivant === "ecrit" && apresSuivant.plan === "GRATUIT",
      `${suivant}, plan ${apresSuivant.plan}`,
    );

    // ---- Le terme dépassé, sans aucune tâche de fond -----------------------
    await ecrire("active", decale(60), TERME_PASSE);
    const apresTerme = await lireLOffreDuCompte(COMPTE);

    record(
      "Un plan payant dont le terme est passé ne vaut plus rien",
      apresTerme.plan === "GRATUIT" && apresTerme.plafond === PLAFOND_GRATUIT,
      `plan ${apresTerme.plan}, plafond ${apresTerme.plafond}`,
    );

    // ---- Le voisin de palier ----------------------------------------------
    // Un endpoint webhook écoute un **compte** Stripe, pas un produit. Si un
    // autre projet partage un jour ce compte, ses abonnements arriveront ici.
    // Le filtre n'est pas une métadonnée qu'on choisit de croire : c'est une
    // jointure sur notre propre table, qui ne contient que des clients que
    // Kairn a créés lui-même.
    const etranger = await compteDuClientStripe("cus_dun_autre_produit");
    const notre = await compteDuClientStripe(CLIENT);

    record(
      "Le client d'un autre produit du même compte Stripe ne désigne aucun compte Kairn",
      etranger === null && notre === COMPTE,
      `étranger : ${etranger ?? "aucun"}, nôtre : ${notre ?? "aucun"}`,
    );

    // ---- La course ---------------------------------------------------------
    // Le vrai enjeu : deux webhooks traités ensemble. Les deux lisent la même
    // ancienne valeur avant d'écrire, et sans le verrou dans le `where`, le plus
    // vieux gagne une fois sur deux.
    let coursesPerdues = 0;

    for (let passe = 0; passe < 20; passe += 1) {
      const base = decale(100 + passe * 10);

      await ecrire("canceled", base);
      await Promise.all([
        ecrire("canceled", new Date(base.getTime() + 1000)),
        ecrire("active", new Date(base.getTime() + 2000)),
      ]);

      const apres = await lireLOffreDuCompte(COMPTE);

      if (apres.plan !== "MENSUEL") coursesPerdues += 1;
    }

    record(
      "Deux événements traités ensemble laissent toujours le plus récent",
      coursesPerdues === 0,
      coursesPerdues === 0 ? "20 passes, aucune inversion" : `${coursesPerdues}/20 inversées`,
    );
  } finally {
    await effacerComptes([COMPTE]);

    const reste = await prisma.subscription.count({ where: { userId: COMPTE } });

    record(
      "Aucune ligne d'abonnement ne subsiste après la passe",
      reste === 0,
      `${reste} ligne(s)`,
    );
  }
}

main()
  .then(() => conclure("L'abonnement ne remonte pas le temps."))
  .catch((error: unknown) => {
    console.error("La vérification a échoué.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.$disconnect();
  });
