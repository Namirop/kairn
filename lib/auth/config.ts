import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { TIMEZONE_HEADER } from "@/lib/auth/en-tetes";
import { reprendreLaVisite } from "@/lib/auth/reprise-de-visite";
import { provisionAccount } from "@/lib/db/account-provisioning";
import { prisma } from "@/lib/db/client";
import { envoyerLeLienDeConnexion, MINUTES_DE_VALIDITE } from "@/lib/email/connexion";
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

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  // Plus de mot de passe, nulle part. Kairn écrit tous les jours : l'adresse
  // doit être valide et vérifiée dès le premier jour, et un lien par email le
  // garantit par construction là où un mot de passe demande une étape de
  // vérification séparée qu'on repousse toujours. Ça supprime au passage tout le
  // code de réinitialisation, et la surface d'attaque qui va avec.
  emailAndPassword: { enabled: false },

  /**
   * Une session dure un mois et se renouvelle à l'usage.
   *
   * Quelqu'un qui vient tous les jours ne doit jamais se reconnecter : chaque
   * visite repousse l'échéance, et seul un mois complet d'absence la fait
   * expirer. C'est ce qui rend un produit quotidien supportable — redemander un
   * lien par email toutes les semaines ferait abandonner.
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

          await provisionAccount(user.id, timezone);

          // Ce qu'un visiteur avait déposé avant de créer son compte lui revient
          // ici, et c'est ici seulement : c'est le seul instant où l'on tient à
          // la fois le compte neuf et le cookie de la visite. Les questions
          // partent dans la foulée — c'est le moment où la dépense reprend, et
          // il coïncide avec celui où quelqu'un s'engage.
          await reprendreLaVisite(user.id);
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: MINUTES_DE_VALIDITE * 60,
      sendMagicLink: async ({ email, url }) => {
        await envoyerLeLienDeConnexion(email, url);
      },
    }),
    // En dernier : il pose les cookies de session sur la réponse, et doit voir
    // ce que les plugins d'avant ont produit.
    nextCookies(),
  ],
});
