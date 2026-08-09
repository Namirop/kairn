import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { provisionAccount } from "@/lib/db/account-provisioning";
import { prisma } from "@/lib/db/client";
import { isSupportedTimeZone } from "@/lib/domain/local-day";

/**
 * L'instance better-auth. Elle possède les modèles User, Session, Account et
 * Verification ; tout ce qui est applicatif vit dans UserSettings et UserStats.
 */

const TIMEZONE_HEADER = "x-cairn-timezone";

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
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    // La vérification par email arrivera avec les gabarits transactionnels.
    requireEmailVerification: false,
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
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export { TIMEZONE_HEADER };
