import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { ENTETE_DU_FUSEAU } from "@/lib/auth/en-tetes";
import { envoyerLAccueil } from "@/lib/auth/email-d-accueil";
import { reprendreLaVisite } from "@/lib/auth/reprise-de-visite";
import { ouvrirLeCompte } from "@/lib/db/ouverture-du-compte";
import { langueDesEnTetes } from "@/lib/i18n/langue-des-en-tetes";
import { prisma } from "@/lib/db/client";
import { envoyerLeCodeDeConnexion, MINUTES_DE_VALIDITE } from "@/lib/email/connexion";
import { LONGUEUR_DU_CODE } from "@/lib/domain/code-de-connexion";
import { fuseauReconnu } from "@/lib/domain/jour-local";

/**
 * L'instance better-auth. Elle possède les modèles User, Session, Account et
 * Verification ; tout ce qui est applicatif vit dans UserSettings et UserStats.
 */

/** Google n'est proposé que si ses identifiants sont présents. */
function fournisseursSociaux() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) return {};

  return { google: { clientId, clientSecret } };
}

export const googleEstPropose = Object.keys(fournisseursSociaux()).length > 0;

/**
 * Les origines admises en plus de `baseURL`. Celle du déploiement courant, sans
 * quoi une preview Vercel refuse toute connexion en 403.
 *
 * Ce n'est pas un précédent pour ajouter `www` à côté de l'apex : un cookie de
 * session appartient à son hôte, et deux hôtes servant le même environnement
 * donneraient deux sessions distinctes. Une preview est un environnement séparé.
 */
function originesDeConfiance(): string[] {
  const deploiement = process.env.VERCEL_URL;

  return [...(deploiement ? [`https://${deploiement}`] : []), ...originesDuReseauLocal()];
}

/**
 * L'adresse LAN du serveur de dev (`AUTH_ORIGINE_LOCALE`, qui change avec le
 * réseau), pour tester depuis un téléphone. Sans elle, better-auth répond
 * « Invalid origin » et l'écran dit « Le code n'a pas pu partir » : la panne
 * semble venir de l'email.
 *
 * `NODE_ENV` vaut `production` sur Vercel comme dans un build local : aucun
 * poste voisin n'y devient une origine de confiance.
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
  trustedOrigins: originesDeConfiance(),
  // Pas de mot de passe : Kairn écrit tous les jours, l'adresse doit être
  // vérifiée dès le premier, et un code reçu par email le garantit par
  // construction.
  emailAndPassword: { enabled: false },

  // Un mois, repoussé à chaque visite : un usage quotidien ne doit jamais
  // redemander de code.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  socialProviders: fournisseursSociaux(),
  rateLimit: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        after: async (user, context) => {
          // Le fuseau est détecté côté client. Le formulaire d'inscription le
          // pose en en-tête ; par Google il n'y en a pas, et la coquille de
          // l'application le réconcilie au premier affichage.
          const envoye = context?.headers?.get(ENTETE_DU_FUSEAU);
          const fuseau = envoye && fuseauReconnu(envoye) ? envoye : "UTC";

          // La langue de l'inscription : le choix fait sur le site, à défaut le
          // navigateur. Par Google comme par code, la requête porte les deux.
          await ouvrirLeCompte(user.id, fuseau, langueDesEnTetes(context?.headers));

          // Seul instant où l'on tient à la fois le compte neuf et le cookie de
          // la visite : le dépôt du visiteur lui revient ici.
          await reprendreLaVisite(user.id);

          // Après la reprise, parce que son contenu dépend de ce que le compte
          // porte déjà. Son échec ne remonte pas : une inscription ne se perd
          // pas pour un email.
          await envoyerLAccueil(user.id);
        },
      },
    },
  },
  plugins: [
    /**
     * Un code plutôt qu'un lien : sur iOS, un lien s'ouvre dans Safari, dont le
     * stockage est séparé de l'application installée, et la session n'y arrive
     * jamais. Un code se retape là où on l'a demandé.
     *
     * `disableSignUp` reste faux : entrer et s'inscrire sont le même geste, et
     * le code part dans les deux cas, ce qui tait l'existence d'une adresse.
     *
     * Un code court se devine : trois tentatives, dix minutes de validité, et
     * stocké haché pour qu'une lecture de `Verification` ne suffise pas.
     */
    emailOTP({
      otpLength: LONGUEUR_DU_CODE,
      expiresIn: MINUTES_DE_VALIDITE * 60,
      allowedAttempts: 3,
      storeOTP: "hashed",
      sendVerificationOTP: async ({ email, otp, type }, ctx) => {
        // Ni mot de passe ni changement d'adresse : tout autre type lève plutôt
        // que d'envoyer un email au texte faux.
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
