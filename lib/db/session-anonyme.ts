import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";

/**
 * Le visiteur qui dépose avant d'avoir un compte.
 *
 * C'est le seul endroit du produit qui dépense sans compte identifié. Il est
 * donc le plus serré des trois verrous du budget : **un dépôt par session**, une
 * poignée par empreinte d'adresse, et l'arrêt à l'extraction — les questions,
 * qui coûtent l'essentiel, n'arrivent qu'après la création du compte.
 *
 * Rien ici ne conserve d'adresse IP. Ce qu'on veut compter est « combien de
 * dépôts viennent d'ici », et une empreinte y répond aussi bien sans garder de
 * donnée qui désigne quelqu'un. Elle est salée par le secret d'application :
 * une base volée ne se retourne pas en liste d'adresses.
 */

/**
 * Sessions anonymes tolérées par empreinte d'adresse, sur la fenêtre.
 *
 * Deux, et pas une. Une seule par adresse serait le réglage évident si une
 * adresse désignait une personne — mais elle n'en désigne pas une. Un bureau, un
 * coworking, une école ou un opérateur mobile derrière son CGNAT sortent tous
 * par une seule IPv4 : à une visite par adresse, le premier arrivé grillerait
 * l'essai de tous les autres pour la journée, et précisément dans les endroits
 * où quelqu'un partage un outil à ses collègues.
 *
 * Serrer davantage ne protégerait d'ailleurs de personne : basculer en 4G ou
 * ouvrir un VPN change d'adresse en cinq secondes. Ce verrou-ci freine le
 * passant qui recommence, pas l'abuseur — c'est `AI_DAILY_CALL_CAP` qui borne la
 * dépense, et lui ne se contourne pas.
 */
export const DEPOTS_PAR_ADRESSE = 2;

/** La fenêtre de la limite par adresse. Un jour : on n'est pas à la minute. */
export const FENETRE_ADRESSE_HEURES = 24;

/**
 * Au-delà, un dépôt anonyme que personne n'a réclamé n'intéresse plus personne.
 *
 * Assez long pour qu'on revienne le lendemain finir ce qu'on a commencé, assez
 * court pour ne pas garder indéfiniment le texte de quelqu'un qui n'a jamais
 * créé de compte — et qui n'a donc accepté aucune conservation.
 */
export const JOURS_AVANT_OUBLI = 7;

export function empreinteDeLAdresse(adresse: string): string {
  const sel = process.env.BETTER_AUTH_SECRET ?? "";

  return createHash("sha256").update(`${sel}:${adresse}`).digest("hex").slice(0, 32);
}

export type OuvertureDeSession =
  { ouverte: true; sessionId: string } | { ouverte: false; motif: "adresse" };

/**
 * Ouvre une session de visite, ou la refuse.
 *
 * Le refus par empreinte se lit avant d'écrire : c'est une lecture puis une
 * écriture, donc une course, et deux visiteurs simultanés depuis la même adresse
 * peuvent passer à trois. C'est assumé — la conséquence d'une course ici est un
 * dépôt de plus, soit deux centimes, là où la fermer demanderait une table de
 * compteurs pour des lignes qu'on efface au bout d'une semaine.
 */
export async function ouvrirUneSession(adresse: string): Promise<OuvertureDeSession> {
  const ipHash = empreinteDeLAdresse(adresse);
  const depuis = new Date(Date.now() - FENETRE_ADRESSE_HEURES * 60 * 60 * 1000);

  const recentes = await prisma.anonymousSession.count({
    where: { ipHash, createdAt: { gte: depuis } },
  });

  if (recentes >= DEPOTS_PAR_ADRESSE) return { ouverte: false, motif: "adresse" };

  const session = await prisma.anonymousSession.create({
    data: { ipHash },
    select: { id: true },
  });

  return { ouverte: true, sessionId: session.id };
}

/**
 * Essais tolérés par visite quand le premier n'a rien donné.
 *
 * Un essai qui ne rend aucun concept — une liste de courses, un lien nu —
 * laisserait sinon quelqu'un devant une page morte : la visite est consommée, il
 * ne peut plus rien tenter, et il n'a rien vu du produit. Une seconde chance
 * coûte une extraction et sauve la seule page qui convertit. Un essai **réussi**,
 * lui, ferme la visite : il a montré ce qu'il avait à montrer.
 */
export const ESSAIS_PAR_VISITE = 2;

/** Cette visite peut-elle encore déposer ? */
export async function sessionDisponible(sessionId: string): Promise<boolean> {
  const session = await prisma.anonymousSession.findUnique({
    where: { id: sessionId },
    select: {
      claimedAt: true,
      _count: { select: { inputs: true, atoms: true } },
    },
  });

  if (!session || session.claimedAt !== null) return false;

  // Des concepts existent : l'essai a abouti, il n'y a plus rien à démontrer.
  if (session._count.atoms > 0) return false;

  return session._count.inputs < ESSAIS_PAR_VISITE;
}

export type DepotAnonyme = {
  inputId: string;
  statut: string;
  motifDechec: string | null;
  concepts: { id: string; concept: string; tags: string[] }[];
};

/** Ce qu'une session a produit, pour l'afficher à qui vient de déposer. */
export async function lireLeDepotAnonyme(sessionId: string): Promise<DepotAnonyme | null> {
  const depot = await prisma.input.findFirst({
    where: { anonymousSessionId: sessionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      failureReason: true,
      atoms: {
        orderBy: { createdAt: "asc" },
        select: { id: true, concept: true, tags: true },
      },
    },
  });

  if (!depot) return null;

  return {
    inputId: depot.id,
    statut: depot.status,
    motifDechec: depot.failureReason,
    concepts: depot.atoms,
  };
}

/**
 * Rattache à un compte ce qu'une session anonyme a produit.
 *
 * Tout se joue dans une transaction : un dépôt qui passerait au compte sans ses
 * concepts, ou l'inverse, laisserait quelqu'un devant une liste vide en lui
 * disant qu'elle est à lui. La session est marquée réclamée dans le même
 * mouvement, ce qui la met hors de portée du cron de nettoyage.
 *
 * Rend les identifiants des concepts repris : c'est à l'appelant de leur
 * demander des questions, parce que c'est **là** que la dépense reprend, et
 * qu'elle doit se voir dans le code qui décide.
 */
export async function rattacherAuCompte(
  sessionId: string,
  userId: string,
  maintenant: Date = new Date(),
): Promise<{ inputIds: string[]; atomIds: string[] }> {
  const session = await prisma.anonymousSession.findUnique({
    where: { id: sessionId },
    select: { claimedAt: true },
  });

  // Déjà réclamée : deux onglets, ou un rechargement. Le premier a gagné.
  if (!session || session.claimedAt !== null) return { inputIds: [], atomIds: [] };

  const depots = await prisma.input.findMany({
    where: { anonymousSessionId: sessionId },
    select: { id: true, atoms: { select: { id: true } } },
  });

  if (depots.length === 0) {
    await prisma.anonymousSession.update({
      where: { id: sessionId },
      data: { claimedAt: maintenant },
    });

    return { inputIds: [], atomIds: [] };
  }

  await prisma.$transaction([
    prisma.input.updateMany({
      where: { anonymousSessionId: sessionId },
      data: { userId, anonymousSessionId: null },
    }),
    prisma.atom.updateMany({
      where: { anonymousSessionId: sessionId },
      data: { userId, anonymousSessionId: null },
    }),
    prisma.anonymousSession.update({
      where: { id: sessionId },
      data: { claimedAt: maintenant },
    }),
  ]);

  return {
    inputIds: depots.map((depot) => depot.id),
    atomIds: depots.flatMap((depot) => depot.atoms.map((atome) => atome.id)),
  };
}

/**
 * Efface les visites que personne n'a réclamées.
 *
 * Les cascades emportent le dépôt et ses concepts. C'est une obligation autant
 * qu'un ménage : quelqu'un qui n'a jamais créé de compte n'a accepté aucune
 * conservation, et son texte n'a pas à rester.
 */
export async function oublierLesVisitesAbandonnees(maintenant: Date = new Date()): Promise<number> {
  const limite = new Date(maintenant.getTime() - JOURS_AVANT_OUBLI * 24 * 60 * 60 * 1000);

  const { count } = await prisma.anonymousSession.deleteMany({
    where: { claimedAt: null, createdAt: { lt: limite } },
  });

  return count;
}
