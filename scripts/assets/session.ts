import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { testUtils } from "better-auth/plugins";
import { prisma } from "@/lib/db/client";
import { SEED_USER_ID } from "@/prisma/seed/account";

/**
 * Un cookie de session prêt pour Playwright, sans passer par l'email : la
 * connexion se fait par code envoyé par email, aucun script ne peut la taper.
 * La session est créée par le plugin `testUtils` de better-auth, dans une
 * instance jetable — jamais la config de production.
 *
 * Le secret et l'URL doivent être ceux du serveur de dev (même `.env`), sinon
 * la signature ne se vérifie pas et l'application renvoie à la connexion. Le
 * compte de démonstration doit exister : la session référence un `User`.
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

  // Les champs optionnels reçoivent les valeurs par défaut du navigateur.
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
