import { cookies, headers } from "next/headers";

/**
 * Le cookie qui porte une visite sans compte, et l'adresse qui la borne.
 *
 * Un seul endroit sait comment on reconnaît un visiteur : le nom du cookie, sa
 * durée, et la façon de lire une adresse derrière un proxy. Éparpiller ça
 * donnerait trois lectures d'en-tête légèrement différentes, dont deux fausses
 * en production.
 */

export const COOKIE_DE_VISITE = "kairn_visite";

/**
 * Une semaine, la même durée que la conservation côté base.
 *
 * Le cookie ne doit pas survivre à ce qu'il désigne : un identifiant qui pointe
 * sur une session effacée ferait croire à un dépôt déjà fait, et bloquerait
 * l'essai de quelqu'un qui revient trop tard.
 */
const DUREE_SECONDES = 7 * 24 * 60 * 60;

export async function lireLaVisite(): Promise<string | null> {
  return (await cookies()).get(COOKIE_DE_VISITE)?.value ?? null;
}

export async function poserLaVisite(sessionId: string): Promise<void> {
  (await cookies()).set(COOKIE_DE_VISITE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_SECONDES,
  });
}

export async function oublierLaVisite(): Promise<void> {
  (await cookies()).delete(COOKIE_DE_VISITE);
}

/**
 * L'adresse du visiteur, telle que l'hébergeur la rapporte.
 *
 * `x-forwarded-for` peut porter une chaîne de relais : la première entrée est le
 * client, les suivantes sont les proxys traversés. On ne la croit pas sur parole
 * — n'importe qui peut l'écrire — mais elle n'autorise rien : elle ne sert qu'à
 * compter, et le pire qu'une fausse adresse obtienne est un essai de plus.
 */
export async function adresseDuVisiteur(): Promise<string> {
  const entetes = await headers();
  const transmise = entetes.get("x-forwarded-for")?.split(",")[0]?.trim();

  return transmise || entetes.get("x-real-ip") || "inconnue";
}
