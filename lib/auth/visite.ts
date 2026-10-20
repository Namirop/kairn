import { cookies, headers } from "next/headers";

/** Le seul endroit qui reconnaît un visiteur sans compte : son cookie et son adresse. */

export const COOKIE_DE_VISITE = "kairn_visite";

/**
 * Comme la conservation en base : un cookie qui survit à sa session ferait
 * croire à un dépôt déjà fait et bloquerait l'essai.
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
 * **La confiance dans cet en-tête ne vient pas de ce fichier** : Vercel réécrit
 * `x-forwarded-for` au bord. Derrière un proxy qui laisse passer celui du
 * client, une adresse forgée à chaque requête donnerait des essais illimités.
 * `x-vercel-forwarded-for` d'abord : aucune couche ne le réécrit. La première
 * entrée d'une chaîne de relais est le client.
 */
export async function adresseDuVisiteur(): Promise<string> {
  const entetes = await headers();

  const transmise =
    premiereEntree(entetes.get("x-vercel-forwarded-for")) ??
    premiereEntree(entetes.get("x-forwarded-for")) ??
    premiereEntree(entetes.get("x-real-ip"));

  if (transmise) return transmise;

  // Échoue fermé (un seau commun) et ferme donc la landing : le dire évite de
  // chercher un bug de quota.
  console.warn(
    "Adresse du visiteur introuvable : les essais anonymes tombent dans un seau commun.",
  );

  return "inconnue";
}

function premiereEntree(entete: string | null): string | undefined {
  return entete?.split(",")[0]?.trim() || undefined;
}
