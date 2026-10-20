import { prisma } from "@/lib/db/client";

/** Ce qu'une visite sans compte peut encore dépenser ; l'ouverture, `session-anonyme.ts`. */

/**
 * Par fenêtre. Un essai réussi ne ferme pas la visite : le premier texte est
 * souvent collé pour voir. Deux, sans faire de la landing un compte gratuit.
 */
export const ESSAIS_PAR_VISITE = 2;

/**
 * Glissante : elle rouvre la porte le lendemain, le cookie durant sept jours.
 * Pas de visite neuve pour rouvrir : celle que le cookie ne désigne plus ne
 * serait plus rattachable. Égale à `FENETRE_ADRESSE_HEURES` sans en dépendre :
 * l'une borne un navigateur, l'autre une sortie réseau.
 */
export const FENETRE_ESSAIS_HEURES = 24;

/** Compteur à part : un plafond commun laisserait des pannes manger un essai dû. */
export const PANNES_TOLEREES = 2;

/**
 * Une panne (`FAILED`) est de notre fait et ne coûte pas d'essai, comme
 * `marquerEchec` rembourse un compte ; un `REJECTED` compte. Épuisée dès qu'un
 * des deux compteurs est plein, rouverte quand la fenêtre est passée.
 */
export type EtatDeLaVisite = "ouverte" | "epuisee" | "close";

/**
 * Close (réclamée ou purgée) n'est pas épuisée : rien à refuser, une visite
 * neuve prend le relais sous le seul plafond par adresse. Une visite réclamée
 * ne se rouvre jamais : son contenu appartient au compte.
 */
export async function etatDeLaVisite(sessionId: string): Promise<EtatDeLaVisite> {
  const session = await prisma.anonymousSession.findUnique({
    where: { id: sessionId },
    select: { claimedAt: true },
  });

  if (!session || session.claimedAt !== null) return "close";

  const { imputables, pannes } = await compterLesDepots(sessionId);

  return imputables < ESSAIS_PAR_VISITE && pannes < PANNES_TOLEREES ? "ouverte" : "epuisee";
}

export async function sessionDisponible(sessionId: string): Promise<boolean> {
  return (await etatDeLaVisite(sessionId)) !== "epuisee";
}

/**
 * Un dépôt en cours est imputable : le supposer en panne ouvrirait un essai de
 * plus à qui a deux onglets.
 */
export async function compterLesDepots(
  sessionId: string,
  maintenant: Date = new Date(),
): Promise<{ imputables: number; pannes: number }> {
  const depuis = new Date(maintenant.getTime() - FENETRE_ESSAIS_HEURES * 60 * 60 * 1000);
  const dansLaFenetre = { anonymousSessionId: sessionId, createdAt: { gte: depuis } };

  const [imputables, pannes] = await Promise.all([
    prisma.input.count({ where: { ...dansLaFenetre, status: { not: "FAILED" } } }),
    prisma.input.count({ where: { ...dansLaFenetre, status: "FAILED" } }),
  ]);

  return { imputables, pannes };
}

/** Choisit le message du refus : « garder tes concepts » sans concept passerait pour une erreur. */
export async function essaiAbouti(sessionId: string): Promise<boolean> {
  return (await prisma.atom.count({ where: { anonymousSessionId: sessionId } })) > 0;
}
