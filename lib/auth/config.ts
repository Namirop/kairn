import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import { ENTETE_DU_FUSEAU } from "@/lib/auth/en-tetes";
import { envoyerLAccueil } from "@/lib/auth/email-d-accueil";
import { reprendreLaVisite } from "@/lib/auth/reprise-de-visite";
import { ouvrirLeCompte } from "@/lib/db/ouverture-du-compte";
import { langueDesEnTetes } from "@/lib/i18n/langue-des-en-tetes";
import { prisma } from "@/lib/db/client";
import { prendreUnEnvoiDeCode } from "@/lib/db/envois-de-code";
import { envoyerLeCodeDeConnexion, MINUTES_DE_VALIDITE } from "@/lib/email/connexion";
import { LONGUEUR_DU_CODE } from "@/lib/domain/code-de-connexion";
import { fuseauReconnu } from "@/lib/domain/jour-local";

/** better-auth possède User, Session, Account et Verification ; l'applicatif vit à côté. */

function fournisseursSociaux() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) return {};

  return { google: { clientId, clientSecret } };
}

export const googleEstPropose = Object.keys(fournisseursSociaux()).length > 0;

/**
 * Sans le déploiement courant, une preview Vercel refuse toute connexion en 403.
 * Pas un précédent pour `www` : un cookie appartient à son hôte, deux hôtes du
 * même environnement donneraient deux sessions.
 */
function originesDeConfiance(): string[] {
  const deploiement = process.env.VERCEL_URL;

  return [...(deploiement ? [`https://${deploiement}`] : []), ...originesDuReseauLocal()];
}

/**
 * Pour tester depuis un téléphone. Sans elle, « Invalid origin » s'affiche en
 * « Le code n'a pas pu partir » : la panne semble venir de l'email. Jamais en
 * production, build local compris.
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
  // Kairn écrit tous les jours : un code par email vérifie l'adresse par construction.
  emailAndPassword: { enabled: false },

  // Repoussée à chaque visite : un usage quotidien ne redemande jamais de code.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  socialProviders: fournisseursSociaux(),
  rateLimit: { enabled: true, storage: "database" },
  // Celles que Vercel écrit lui-même, dans l'ordre de `adresseDuVisiteur`.
  advanced: { ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"] } },
  hooks: {
    // Avant le plugin, qui remplace le code en cours : refuser après laisserait
    // un tiers invalider le code de quelqu'un.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/email-otp/send-verification-otp") return;

      const adresse: unknown = ctx.body?.email;

      if (typeof adresse === "string" && !(await prendreUnEnvoiDeCode(adresse))) {
        throw new APIError("TOO_MANY_REQUESTS", { message: "Trop de codes pour cette adresse." });
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user, context) => {
          // Absent par Google : la coquille le réconcilie au premier affichage.
          const envoye = context?.headers?.get(ENTETE_DU_FUSEAU);
          const fuseau = envoye && fuseauReconnu(envoye) ? envoye : "UTC";

          await ouvrirLeCompte(user.id, fuseau, langueDesEnTetes(context?.headers));

          // Seul instant qui tient à la fois le compte neuf et le cookie de visite.
          await reprendreLaVisite(user.id);

          // Après la reprise, dont dépend son contenu. Son échec ne remonte pas.
          await envoyerLAccueil(user.id);
        },
      },
    },
  },
  plugins: [
    /**
     * Un code, pas un lien : sur iOS un lien s'ouvre dans Safari, au stockage
     * séparé de l'app installée. `disableSignUp` reste faux : le code part dans
     * les deux cas, ce qui tait l'existence d'une adresse. Haché, pour qu'une
     * lecture de `Verification` ne suffise pas.
     */
    emailOTP({
      otpLength: LONGUEUR_DU_CODE,
      expiresIn: MINUTES_DE_VALIDITE * 60,
      allowedAttempts: 3,
      storeOTP: "hashed",
      sendVerificationOTP: async ({ email, otp, type }, ctx) => {
        // Tout autre type lève plutôt que d'envoyer un email au texte faux.
        if (type !== "sign-in") {
          throw new Error(`Type de code non pris en charge : ${type}.`);
        }

        const compte = await ctx?.context.internalAdapter.findUserByEmail(email);

        await envoyerLeCodeDeConnexion(email, otp, {
          userId: compte?.user.id ?? null,
          entetes: ctx?.headers ?? null,
        });
      },
    }),
    // En dernier : il pose les cookies d'après ce que les autres ont produit.
    nextCookies(),
  ],
});
