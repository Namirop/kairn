import { prisma } from "@/lib/db/client";
import type { SujetDeRetour } from "@/lib/db/types";
import { peutEncoreEnvoyer } from "@/lib/domain/retour-sur-le-produit";

/** Plafond haut à dessein : il ne refuse que l'usage détourné de la table. */

export type RetourAEcrire = {
  userId: string;
  sujet: SujetDeRetour;
  message: string;
  ecran: string | null;
  contexte: string | null;
  capture: { donnees: Uint8Array; mediaType: string } | null;
};

export type EcritureDeRetour = { ok: true } | { ok: false; motif: "PLAFOND" };

/** Glissante, par compte. */
const FENETRE_MS = 24 * 60 * 60 * 1000;

function debutDeFenetre(maintenant: Date): Date {
  return new Date(maintenant.getTime() - FENETRE_MS);
}

/**
 * Sans réserver, pour refuser avant que `sharp` décode une capture en boucle.
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

/** Plafond ici, pas dans la Server Action : un second appelant ne le contournera pas. */
export async function ecrireUnRetour(
  retour: RetourAEcrire,
  maintenant: Date = new Date(),
): Promise<EcritureDeRetour> {
  // Verrou par compte : sans lui, des envois simultanés passent tous le plafond.
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
    // Les envois attendent le verrou : les 2 s par défaut feraient échouer un doublé.
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
  /** Null si le compte est parti depuis. */
  auteur: string | null;
};

export type PageDeRetours = {
  lignes: RetourLu[];
  total: number;
  /** Tous rangs confondus : le seul chiffre utile. */
  aLire: number;
  page: number;
  pages: number;
};

/**
 * Non traités d'abord : par date seule, un non lu passerait sous les traités.
 * Le rang vient d'une URL : ramené dans les bornes plutôt que refusé.
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
      // Jamais les octets dans une liste : un mégaoctet dont on n'affiche rien.
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

/** Rend le nouvel état. */
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

/** Seule requête qui rapporte des octets d'image : ne pas les charger ailleurs. */
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
