import { cookies, headers } from "next/headers";

/**
 * Le cookie qui porte une visite sans compte, et l'adresse qui la borne.
 *
 * Le seul endroit qui sait reconnaître un visiteur : nom et durée du cookie,
 * lecture de l'adresse derrière un proxy.
 */

export const COOKIE_DE_VISITE = "kairn_visite";

/**
 * Une semaine, la même durée que la conservation côté base : un cookie qui
 * survit à sa session ferait croire à un dépôt déjà fait et bloquerait l'essai.
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
 * **Ce qui rend cet en-tête digne de foi n'est pas dans ce fichier.** Une
 * adresse forgée différemment à chaque requête, sans cookie renvoyé, donnerait
 * des visites illimitées : `ouvrirUneSession` ne trouverait jamais rien de
 * récent à compter. Le verrou tient parce que Vercel réécrit `x-forwarded-for`
 * avec l'adresse vue par le bord. Derrière un proxy qui laisse passer l'en-tête
 * du client, il ne vaut plus rien.
 *
 * `x-vercel-forwarded-for` d'abord : la plateforme l'écrit et aucune couche ne
 * le réécrit. Dans une chaîne de relais, la première entrée est le client.
 */
export async function adresseDuVisiteur(): Promise<string> {
  const entetes = await headers();

  const transmise =
    premiereEntree(entetes.get("x-vercel-forwarded-for")) ??
    premiereEntree(entetes.get("x-forwarded-for")) ??
    premiereEntree(entetes.get("x-real-ip"));

  if (transmise) return transmise;

  // Le repli échoue fermé (un seau commun pour tous les visiteurs sans
  // en-tête), donc il ferme la landing : le dire évite de chercher un bug de
  // quota.
  console.warn(
    "Adresse du visiteur introuvable : les essais anonymes tombent dans un seau commun.",
  );

  return "inconnue";
}

function premiereEntree(entete: string | null): string | undefined {
  return entete?.split(",")[0]?.trim() || undefined;
}
