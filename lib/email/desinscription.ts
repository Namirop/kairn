import { createHmac, timingSafeEqual } from "node:crypto";

/** Signé et sans état : le lien d'un email doit fonctionner sans session. */

function secret(): string {
  const valeur = process.env.BETTER_AUTH_SECRET;

  if (!valeur) {
    throw new Error("BETTER_AUTH_SECRET est absent : impossible de signer un jeton.");
  }

  return valeur;
}

function signer(charge: string): string {
  return createHmac("sha256", secret()).update(charge).digest("base64url");
}

export function creerLeJetonDeDesinscription(userId: string): string {
  const charge = Buffer.from(userId, "utf8").toString("base64url");

  return `${charge}.${signer(charge)}`;
}

export function lireLeJetonDeDesinscription(jeton: string): string | null {
  const [charge, signature] = jeton.split(".");

  if (!charge || !signature) return null;

  const attendue = Buffer.from(signer(charge));
  const recue = Buffer.from(signature);

  if (attendue.length !== recue.length) return null;
  if (!timingSafeEqual(attendue, recue)) return null;

  const userId = Buffer.from(charge, "base64url").toString("utf8");

  return userId.length > 0 ? userId : null;
}
