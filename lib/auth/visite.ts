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
 * **Ce qui rend cet en-tête digne de foi n'est pas dans ce fichier.** Le
 * commentaire précédent disait qu'une fausse adresse ne vaut « qu'un essai de
 * plus » ; c'est faux. Une `x-forwarded-for` forgée différemment à chaque
 * requête, plus un cookie de visite jamais renvoyé, donne des visites
 * **illimitées** : chaque appel produit une empreinte inédite, donc
 * `ouvrirUneSession` ne trouve jamais rien de récent à compter. Il ne resterait
 * que le plafond journalier d'appels pour arrêter la page.
 *
 * Ce qui tient le montage, c'est que **la plateforme réécrit l'en-tête** : sur
 * Vercel, `x-forwarded-for` est remplacé par l'adresse vue par le bord, et les
 * valeurs entrantes ne sont pas transmises — précisément contre l'usurpation.
 * Le raisonnement est donc celui-ci, et il ne survit pas à un changement
 * d'hébergeur : le jour où ce code tourne derrière un proxy qui laisse passer
 * l'en-tête du client, ce verrou-là ne vaut plus rien et il faut le refaire.
 *
 * `x-vercel-forwarded-for` d'abord parce que c'est celui que la plateforme
 * écrit elle-même et qu'aucune couche intermédiaire ne réécrit ; les deux
 * autres sont des replis. `x-forwarded-for` peut porter une chaîne de relais :
 * la première entrée est le client, les suivantes sont les proxys traversés.
 */
export async function adresseDuVisiteur(): Promise<string> {
  const entetes = await headers();

  const transmise =
    premiereEntree(entetes.get("x-vercel-forwarded-for")) ??
    premiereEntree(entetes.get("x-forwarded-for")) ??
    premiereEntree(entetes.get("x-real-ip"));

  if (transmise) return transmise;

  // Le repli échoue fermé — tous les visiteurs sans en-tête partagent un seul
  // seau de deux visites — donc il n'ouvre rien. Mais il **ferme** la landing,
  // et sans cette ligne il la fermerait en silence : on chercherait un bug de
  // quota là où il n'y a qu'un en-tête manquant.
  console.warn(
    "Adresse du visiteur introuvable : les essais anonymes tombent dans un seau commun.",
  );

  return "inconnue";
}

function premiereEntree(entete: string | null): string | undefined {
  return entete?.split(",")[0]?.trim() || undefined;
}
