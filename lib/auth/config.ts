import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { TIMEZONE_HEADER } from "@/lib/auth/en-tetes";
import { envoyerLAccueil } from "@/lib/auth/email-d-accueil";
import { reprendreLaVisite } from "@/lib/auth/reprise-de-visite";
import { provisionAccount } from "@/lib/db/account-provisioning";
import { langueDesEnTetes } from "@/lib/i18n/langue-des-en-tetes";
import { prisma } from "@/lib/db/client";
import { envoyerLeCodeDeConnexion, MINUTES_DE_VALIDITE } from "@/lib/email/connexion";
import { LONGUEUR_DU_CODE } from "@/lib/domain/code-de-connexion";
import { isSupportedTimeZone } from "@/lib/domain/local-day";

/**
 * L'instance better-auth. Elle possède les modèles User, Session, Account et
 * Verification ; tout ce qui est applicatif vit dans UserSettings et UserStats.
 */

/** Google n'est proposé que si ses identifiants sont présents. */
function socialProviders() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) return {};

  return { google: { clientId, clientSecret } };
}

export const isGoogleEnabled = Object.keys(socialProviders()).length > 0;

/**
 * Les origines admises en plus de `baseURL` : celle du déploiement courant.
 *
 * Chaque déploiement Vercel porte son propre domaine, et le client vise
 * l'origine de la page. Sans cette ligne, une preview refuse toute connexion en
 * 403 — donc on ne peut pas éprouver une branche avant de la fusionner, ce qui
 * est précisément le moment où l'on voudrait le faire.
 *
 * Ce n'est pas la même chose que d'ajouter `www` à côté de l'apex, et il ne faut
 * surtout pas en conclure qu'on peut. Un cookie de session appartient à l'hôte
 * qui l'a posé : deux hôtes servant le **même** environnement donneraient deux
 * sessions distinctes, et on serait connecté sur l'un en étant déconnecté sur
 * l'autre. Une preview, elle, est un environnement séparé — sa session n'a
 * aucune raison d'être celle de la production.
 */
function trustedOrigins(): string[] {
  const deploiement = process.env.VERCEL_URL;

  return [...(deploiement ? [`https://${deploiement}`] : []), ...originesDuReseauLocal()];
}

/**
 * Les adresses du réseau local, **en développement seulement**.
 *
 * Le serveur de dev écoute aussi sur l'adresse LAN de la machine, et c'est le
 * seul moyen de regarder un écran depuis un téléphone ou un autre poste. Sans
 * cette ligne, better-auth y refuse toute connexion en 403 — « Invalid origin »
 * dans les journaux, « Le code n'a pas pu partir » à l'écran, et on cherche la
 * panne du côté de l'email alors qu'aucun email n'a jamais été demandé.
 *
 * `NODE_ENV` vaut `production` sur Vercel comme dans un build local : la liste
 * y reste donc exactement celle d'avant, et un poste voisin ne peut pas se
 * présenter comme une origine de confiance.
 *
 * `AUTH_ORIGINE_LOCALE` porte l'adresse du moment — elle change avec le réseau,
 * donc elle n'a rien à faire en dur. Absente, rien ne s'ouvre.
 */
function originesDuReseauLocal(): string[] {
  if (process.env.NODE_ENV === "production") return [];

  const locale = process.env.AUTH_ORIGINE_LOCALE?.trim();

  return locale ? [locale] : [];
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: trustedOrigins(),
  // Plus de mot de passe, nulle part. Kairn écrit tous les jours : l'adresse
  // doit être valide et vérifiée dès le premier jour, et un code reçu par email
  // le garantit par construction là où un mot de passe demande une étape de
  // vérification séparée qu'on repousse toujours. Ça supprime au passage tout le
  // code de réinitialisation, et la surface d'attaque qui va avec.
  emailAndPassword: { enabled: false },

  /**
   * Une session dure un mois et se renouvelle à l'usage.
   *
   * Quelqu'un qui vient tous les jours ne doit jamais se reconnecter : chaque
   * visite repousse l'échéance, et seul un mois complet d'absence la fait
   * expirer. C'est ce qui rend un produit quotidien supportable — redemander un
   * code par email toutes les semaines ferait abandonner.
   */
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  socialProviders: socialProviders(),
  rateLimit: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        after: async (user, context) => {
          // Le fuseau est détecté côté client. Le formulaire d'inscription le
          // pose en en-tête ; par Google il n'y en a pas, et la coquille de
          // l'application le réconcilie au premier affichage.
          const submitted = context?.headers?.get(TIMEZONE_HEADER);
          const timezone = submitted && isSupportedTimeZone(submitted) ? submitted : "UTC";

          // La langue de l'inscription : le choix fait sur le site, à défaut le
          // navigateur. Par Google comme par code, la requête porte les deux.
          await provisionAccount(user.id, timezone, langueDesEnTetes(context?.headers));

          // Ce qu'un visiteur avait déposé avant de créer son compte lui revient
          // ici, et c'est ici seulement : c'est le seul instant où l'on tient à
          // la fois le compte neuf et le cookie de la visite. Les questions
          // partent dans la foulée — c'est le moment où la dépense reprend, et
          // il coïncide avec celui où quelqu'un s'engage.
          await reprendreLaVisite(user.id);

          // L'accueil part en dernier, et il part d'ici plutôt que d'un passage
          // horaire : c'est le seul endroit où l'on sait que le compte vient
          // d'être créé. Il se lit après la reprise, parce que son contenu
          // dépend de ce que le compte porte déjà — un essai repris n'a pas à
          // s'entendre dire de déposer sa première chose. Son échec ne remonte
          // pas : une inscription ne se perd pas pour un email.
          await envoyerLAccueil(user.id);
        },
      },
    },
  },
  plugins: [
    /**
     * Un code à six chiffres, et non le lien qu'il remplace.
     *
     * Un lien s'ouvre depuis le client mail, donc dans le navigateur par défaut,
     * jamais dans l'application installée. Sur iOS c'est sans recours — une
     * application posée sur l'écran d'accueil ne peut pas intercepter un lien,
     * et son stockage est séparé de celui de Safari : la session créée par le
     * lien ne l'atteint pas, et on reste dehors dans la fenêtre où l'on voulait
     * entrer. Un code se retape là où on l'a demandé, et la session s'y crée.
     *
     * `disableSignUp` reste faux : sans mot de passe, entrer et s'inscrire sont
     * le même geste, et le code crée le compte s'il n'existe pas. C'est aussi ce
     * qui garde l'écran muet sur l'existence d'une adresse — le code part dans
     * les deux cas, et la réponse est la même.
     *
     * Six chiffres se devinent, contrairement à un jeton signé. Deux garde-fous
     * plutôt qu'un : trois tentatives par code, et dix minutes de validité. Le
     * code est stocké haché, pour qu'une lecture de la table `Verification` ne
     * suffise pas à entrer.
     */
    emailOTP({
      otpLength: LONGUEUR_DU_CODE,
      expiresIn: MINUTES_DE_VALIDITE * 60,
      allowedAttempts: 3,
      storeOTP: "hashed",
      sendVerificationOTP: async ({ email, otp, type }, ctx) => {
        // Un seul type nous concerne : il n'y a ni mot de passe à réinitialiser
        // ni changement d'adresse. Lever plutôt qu'envoyer un email dont le texte
        // parlerait d'autre chose que ce qui a été demandé.
        if (type !== "sign-in") {
          throw new Error(`Type de code non pris en charge : ${type}.`);
        }

        // La langue du code : celle du compte s'il existe déjà, sinon celle de
        // la requête — à l'inscription, le code part avant le compte.
        const compte = await ctx?.context.internalAdapter.findUserByEmail(email);

        await envoyerLeCodeDeConnexion(email, otp, {
          userId: compte?.user.id ?? null,
          entetes: ctx?.headers ?? null,
        });
      },
    }),
    // En dernier : il pose les cookies de session sur la réponse, et doit voir
    // ce que les plugins d'avant ont produit.
    nextCookies(),
  ],
});
