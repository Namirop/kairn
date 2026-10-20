import { prisma } from "@/lib/db/client";
import { type Plan, planEffectif } from "@/lib/domain/plafond-du-plan";

/**
 * Les comptes nommés (`administration.ts` agrège). Derrière
 * `exigerUnAdministrateur` : seul endroit où une adresse s'affiche en clair.
 */

/** Les compteurs sont des totaux, pas des fenêtres. */
export type CompteInscrit = {
  id: string;
  email: string;
  nom: string;
  /** Non vérifiée : peut-être jamais ouvert son courrier. */
  emailVerifie: boolean;
  inscritLe: Date;
  /** Nul sans aucun passage. */
  dernierPassage: Date | null;
  depots: number;
  concepts: number;
  serie: number;
  /** À l'instant de la lecture : un terme passé rend au gratuit. */
  plan: Plan;
};

type Ligne = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  dernier: Date | null;
  depots: number;
  concepts: number;
  serie: number;
  plan: Plan | null;
  currentPeriodEnd: Date | null;
};

/** Un garde-fou, pas de la pagination : s'il faut paginer, l'écran est à repenser. */
export const COMPTES_AU_PLUS = 200;

export async function lireLaListeDesComptes(
  maintenant: Date = new Date(),
): Promise<CompteInscrit[]> {
  const lignes = await prisma.$queryRaw<Ligne[]>`
    SELECT
      u."id",
      u."email",
      u."name",
      u."emailVerified",
      u."createdAt",
      s."plan",
      s."currentPeriodEnd",
      coalesce(st."currentStreak", 0)::int AS serie,
      (SELECT count(*) FROM "Input" i WHERE i."userId" = u."id")::int AS depots,
      (SELECT count(*) FROM "Atom" a WHERE a."userId" = u."id")::int AS concepts,
      (SELECT max(r."reviewedAt") FROM "Review" r WHERE r."userId" = u."id") AS dernier
    FROM "User" u
    LEFT JOIN "Subscription" s ON s."userId" = u."id"
    LEFT JOIN "UserStats" st ON st."userId" = u."id"
    ORDER BY u."createdAt" DESC
    LIMIT ${COMPTES_AU_PLUS}
  `;

  return lignes.map((ligne) => ({
    id: ligne.id,
    email: ligne.email,
    nom: ligne.name,
    emailVerifie: ligne.emailVerified,
    inscritLe: ligne.createdAt,
    dernierPassage: ligne.dernier,
    depots: ligne.depots,
    concepts: ligne.concepts,
    serie: ligne.serie,
    // Règle du domaine plutôt que SQL : le même verdict qu'ailleurs dans le produit.
    plan: planEffectif(
      { plan: ligne.plan ?? "GRATUIT", finDePeriode: ligne.currentPeriodEnd },
      maintenant,
    ),
  }));
}
