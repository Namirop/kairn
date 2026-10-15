import { prisma } from "@/lib/db/client";
import type { SujetDeRetour } from "@/lib/db/types";
import { peutEncoreEnvoyer } from "@/lib/domain/retour-sur-le-produit";

/**
 * Les retours sur le produit : ce qu'on en écrit, ce qu'on en relit. Le
 * plafond est haut à dessein : il ne refuse que l'usage détourné de la table.
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

function debutDeFenetre(maintenant: Date): Date {
  return new Date(maintenant.getTime() - FENETRE_MS);
}

/**
 * Le plafond lu sans rien réserver, pour refuser avant de décoder une capture :
 * un compte au plafond ne doit pas pouvoir faire travailler `sharp` en boucle.
 * Le refus qui fait foi reste celui d'`ecrireUnRetour`.
 */
export async function peutEncoreEnvoyerUnRetour(
  userId: string,
  maintenant: Date = new Date(),
): Promise<boolean> {
  const dejaEnvoyes = await prisma.retour.count({
    where: { userId, createdAt: { gte: debutDeFenetre(maintenant) } },
  });

  return peutEncoreEnvoyer(dejaEnvoyes);
}

/**
 * Écrit un retour, si le compte n'a pas déjà rempli sa journée. Le plafond est
 * ici et non dans la Server Action : c'est le passage obligé vers l'écriture,
 * qu'un second appelant ne contournera pas.
 */
export async function ecrireUnRetour(
  retour: RetourAEcrire,
  maintenant: Date = new Date(),
): Promise<EcritureDeRetour> {
  // Compter puis écrire, sous un verrou par compte : sans lui, des envois
  // simultanés lisent tous le même compte et passent tous le plafond.
  return prisma.$transaction(
    async (tx): Promise<EcritureDeRetour> => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`retour:${retour.userId}`}))`;

      const dejaEnvoyes = await tx.retour.count({
        where: { userId: retour.userId, createdAt: { gte: debutDeFenetre(maintenant) } },
      });

      if (!peutEncoreEnvoyer(dejaEnvoyes)) return { ok: false, motif: "PLAFOND" };

      await tx.retour.create({
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
    },
    // Les envois d'un même compte attendent leur tour sur le verrou : l'attente
    // d'une connexion par défaut (2 s) ferait échouer un double envoi.
    { maxWait: 10_000, timeout: 15_000 },
  );
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
 * Par date seule, un retour non lu redescendrait sous les traités.
 *
 * Le rang est ramené dans les bornes plutôt que refusé : il vient d'une URL.
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
      // La colonne d'octets n'est jamais chargée pour une liste : quelques
      // captures pèseraient un mégaoctet dont on n'affiche rien.
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
 * La capture d'un retour, pour la seule route qui la sert. Seule requête qui
 * rapporte des octets d'image : ne pas les charger ailleurs.
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
