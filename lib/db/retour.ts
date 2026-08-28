import { prisma } from "@/lib/db/client";
import type { SujetDeRetour } from "@/lib/db/types";
import { peutEncoreEnvoyer } from "@/lib/domain/retour-sur-le-produit";

/**
 * Les retours sur le produit : ce qu'on en écrit, ce qu'on en relit.
 *
 * C'est la seconde instrumentation qualitative du produit, à côté des
 * signalements — et la seule qui porte sur autre chose qu'une question. Un
 * mauvais découpage se voit dans les chiffres ; un mot de travers, un écran qui
 * déborde, une logique qui surprend ne laissent aucune trace nulle part. Ils
 * n'en laisseront que si quelqu'un les écrit.
 *
 * D'où la forme du formulaire, et d'où celle de ce fichier : on demande le
 * minimum, on n'échoue jamais en silence, et le plafond est haut. Le seul cas où
 * l'on refuse est celui où la table sert à autre chose qu'à ce pour quoi elle
 * existe.
 */

export type RetourAEcrire = {
  userId: string;
  sujet: SujetDeRetour;
  message: string;
  ecran: string | null;
  contexte: string | null;
  capture: { donnees: Uint8Array; mediaType: string } | null;
};

/** Ce que l'écriture rend, et le seul refus possible. */
export type EcritureDeRetour = { ok: true } | { ok: false; motif: "PLAFOND" };

/** La fenêtre du plafond par compte : vingt-quatre heures glissantes. */
const FENETRE_MS = 24 * 60 * 60 * 1000;

/**
 * Écrit un retour, si le compte n'a pas déjà rempli sa journée.
 *
 * Le plafond est ici et non dans la Server Action, pour la raison qui vaut
 * partout dans ce dossier : c'est le passage obligé vers l'écriture, et une
 * garde posée plus haut se contourne le jour où un second appelant apparaît.
 *
 * L'identifiant du compte vient de la session, jamais du formulaire — la Server
 * Action le lit et le passe, il n'existe aucun chemin où le client le fournisse.
 */
export async function ecrireUnRetour(
  retour: RetourAEcrire,
  maintenant: Date = new Date(),
): Promise<EcritureDeRetour> {
  const depuis = new Date(maintenant.getTime() - FENETRE_MS);

  const dejaEnvoyes = await prisma.retour.count({
    where: { userId: retour.userId, createdAt: { gte: depuis } },
  });

  if (!peutEncoreEnvoyer(dejaEnvoyes)) return { ok: false, motif: "PLAFOND" };

  await prisma.retour.create({
    data: {
      userId: retour.userId,
      sujet: retour.sujet,
      message: retour.message,
      ecran: retour.ecran,
      contexte: retour.contexte,
      captureData: retour.capture ? Buffer.from(retour.capture.donnees) : null,
      captureMediaType: retour.capture?.mediaType ?? null,
    },
  });

  return { ok: true };
}

export type RetourLu = {
  id: string;
  sujet: SujetDeRetour;
  message: string;
  ecran: string | null;
  contexte: string | null;
  aUneCapture: boolean;
  traiteLe: Date | null;
  createdAt: Date;
  /** L'adresse de qui a écrit, ou null si le compte est parti depuis. */
  auteur: string | null;
};

export type PageDeRetours = {
  lignes: RetourLu[];
  total: number;
  /** Ce qui reste à lire, tous rangs confondus : c'est le seul chiffre utile. */
  aLire: number;
  page: number;
  pages: number;
};

/**
 * Une page de retours : ce qui n'est pas traité d'abord, puis le plus récent.
 *
 * L'ordre est le point de tout l'écran. Trier par date seule ferait redescendre
 * un retour non lu sous quinze retours traités au bout d'une semaine, et il n'y
 * a personne d'autre pour le rattraper.
 *
 * Le rang demandé est ramené dans les bornes plutôt que refusé, comme pour les
 * signalements : un numéro de page vient d'une URL.
 */
export async function listerLesRetoursPagines(
  rang: number,
  parPage: number,
): Promise<PageDeRetours> {
  const [total, aLire] = await Promise.all([
    prisma.retour.count(),
    prisma.retour.count({ where: { traiteLe: null } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / parPage));
  const page = Math.min(Math.max(1, Math.trunc(rang) || 1), pages);

  const lignes = await prisma.retour.findMany({
    orderBy: [{ traiteLe: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    skip: (page - 1) * parPage,
    take: parPage,
    select: {
      id: true,
      sujet: true,
      message: true,
      ecran: true,
      contexte: true,
      traiteLe: true,
      createdAt: true,
      captureMediaType: true,
      user: { select: { email: true } },
    },
  });

  return {
    lignes: lignes.map((ligne) => ({
      id: ligne.id,
      sujet: ligne.sujet,
      message: ligne.message,
      ecran: ligne.ecran,
      contexte: ligne.contexte,
      // La colonne d'octets n'est jamais chargée pour une liste : une page de
      // cinq captures ferait un mégaoctet de réponse dont on n'affiche rien.
      aUneCapture: ligne.captureMediaType !== null,
      traiteLe: ligne.traiteLe,
      createdAt: ligne.createdAt,
      auteur: ligne.user?.email ?? null,
    })),
    total,
    aLire,
    page,
    pages,
  };
}

/** Bascule l'état « traité » d'un retour, et rend ce qu'il vaut désormais. */
export async function basculerLeTraitement(
  id: string,
  maintenant: Date = new Date(),
): Promise<boolean | null> {
  const retour = await prisma.retour.findUnique({ where: { id }, select: { traiteLe: true } });

  if (!retour) return null;

  const traite = retour.traiteLe === null;

  await prisma.retour.update({
    where: { id },
    data: { traiteLe: traite ? maintenant : null },
  });

  return traite;
}

/**
 * La capture d'un retour, pour la seule route qui la sert.
 *
 * Elle est lue à part et jamais avec la liste : c'est la seule requête du
 * produit qui rapporte des octets d'image, et elle doit rester la seule.
 */
export async function lireLaCapture(
  id: string,
): Promise<{ donnees: Uint8Array; mediaType: string } | null> {
  const retour = await prisma.retour.findUnique({
    where: { id },
    select: { captureData: true, captureMediaType: true },
  });

  if (!retour?.captureData || !retour.captureMediaType) return null;

  return { donnees: new Uint8Array(retour.captureData), mediaType: retour.captureMediaType };
}
