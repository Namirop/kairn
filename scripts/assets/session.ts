import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { testUtils } from "better-auth/plugins";
import { prisma } from "@/lib/db/client";
import { SEED_USER_ID } from "@/prisma/seed/account";

/**
 * Un cookie de session prêt pour Playwright, sans passer par l'email.
 *
 * L'authentification de Kairn est un code à six chiffres envoyé par email : il
 * n'y a pas de mot de passe qu'un script puisse « taper ». On mint donc une vraie
 * session pour le compte de démonstration avec le plugin `testUtils` de
 * better-auth — dans une instance jetable, jamais la config de production — et on
 * pose son cookie dans le contexte du navigateur.
 *
 * Le secret et l'URL doivent être ceux du serveur dev (le même `.env`), sinon la
 * signature du cookie ne se vérifie pas et l'application renvoie sur l'écran de
 * connexion. Le compte de démonstration doit exister avant l'appel : `createSession`
 * référence un `User`.
 */

export type CookieDeSession = {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax" | "Strict" | "None";
  expires?: number;
};

function instanceDeTest() {
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET est absent : le cookie de session ne peut pas être signé.");
  }

  return betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    plugins: [testUtils()],
  });
}

export async function cookiesDeSession(userId: string = SEED_USER_ID): Promise<CookieDeSession[]> {
  const ctx = await instanceDeTest().$context;
  const cookies = await ctx.test.getCookies({ userId, domain: "localhost" });

  // `getCookies` rend déjà la forme attendue par Playwright ; on ne fait que
  // combler les champs optionnels avec leurs valeurs par défaut effectives.
  return cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    httpOnly: cookie.httpOnly ?? true,
    secure: cookie.secure ?? false,
    sameSite: cookie.sameSite ?? "Lax",
    expires: cookie.expires,
  }));
}
