import { prisma } from "@/lib/db/client";

/**
 * Ce qu'une visite sans compte peut encore dépenser. Qui a le droit d'ouvrir
 * une visite se décide dans `session-anonyme.ts`.
 */

/**
 * Essais accordés à une visite, par tranche de vingt-quatre heures. Un essai
 * réussi ne ferme pas la visite : le premier texte est souvent collé pour voir,
 * le vrai vient après. Deux, pour laisser retenter sans faire de la landing un
 * compte gratuit déguisé.
 */
export const ESSAIS_PAR_VISITE = 2;

/**
 * Fenêtre glissante sur laquelle les essais se comptent : c'est elle qui rouvre
 * la porte le lendemain, alors que le cookie dure sept jours.
 *
 * On ne rouvre pas en créant une visite neuve : la reprise au compte passe par
 * le cookie, et une visite qu'il ne désigne plus ne serait plus rattachable.
 *
 * Même valeur que `FENETRE_ADRESSE_HEURES` sans en dépendre : l'une borne un
 * navigateur, l'autre une sortie réseau.
 */
export const FENETRE_ESSAIS_HEURES = 24;

/**
 * Les pannes qu'une visite absorbe avant qu'on referme, sur un compteur à part
 * des essais : un plafond total partagé laissait trois pannes manger un essai
 * dû. Au plus quatre extractions par visite et par fenêtre, réparties.
 */
export const PANNES_TOLEREES = 2;

/**
 * Une panne (`FAILED`) est un incident de notre côté et ne coûte pas d'essai,
 * comme `marquerEchec` rembourse sa place à un compte. Seul un `REJECTED`
 * compte : la chaîne a tourné, c'est le texte qui n'avait rien à retenir.
 *
 * La visite est épuisée dès que l'un des deux compteurs est plein, et se
 * rouvre quand la fenêtre a passé dessus.
 */
export type EtatDeLaVisite = "ouverte" | "epuisee" | "close";

/**
 * Une visite close n'est pas épuisée. Le cookie survit à ce qu'il désigne
 * (visite réclamée par un compte, ou purgée) : il n'y a alors rien à refuser,
 * une visite neuve prend le relais et seul le plafond par adresse juge. La
 * visite réclamée, elle, ne se rouvre jamais : son contenu appartient au compte.
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
 * Ce qu'une visite a dépensé sur la fenêtre, dans les deux compteurs.
 *
 * Un dépôt en cours compte comme imputable : le supposer réussi ouvrirait un
 * essai de plus à qui a deux onglets.
 *
 * `maintenant` en paramètre pour que les scripts de vérification se placent
 * après la fenêtre sans attendre un jour.
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

/**
 * L'essai de cette visite a-t-il produit des concepts ? Choisit le message du
 * refus : inviter à « garder tes concepts » quelqu'un qui n'en a aucun ferait
 * passer l'invitation pour une erreur.
 */
export async function essaiAbouti(sessionId: string): Promise<boolean> {
  return (await prisma.atom.count({ where: { anonymousSessionId: sessionId } })) > 0;
}
