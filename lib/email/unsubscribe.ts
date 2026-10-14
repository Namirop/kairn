import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jeton de désinscription, signé et sans état : le lien d'un email doit
 * fonctionner sans session. Il porte l'identifiant du compte et sa signature.
 */

function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET;

  if (!value) {
    throw new Error("BETTER_AUTH_SECRET est absent : impossible de signer un jeton.");
  }

  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createUnsubscribeToken(userId: string): string {
  const payload = Buffer.from(userId, "utf8").toString("base64url");

  return `${payload}.${sign(payload)}`;
}

/** Rend l'identifiant du compte, ou `null` si le jeton est douteux. */
export function readUnsubscribeToken(token: string): string | null {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);

  if (expected.length !== received.length) return null;
  if (!timingSafeEqual(expected, received)) return null;

  const userId = Buffer.from(payload, "base64url").toString("utf8");

  return userId.length > 0 ? userId : null;
}
