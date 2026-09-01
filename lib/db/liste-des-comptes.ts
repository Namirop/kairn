import { prisma } from "@/lib/db/client";
import { type Plan, planEffectif } from "@/lib/domain/plafond-du-plan";

/**
 * Les comptes un par un, nommés.
 *
 * Le bloc de chiffres d'à côté dit combien il y en a et combien s'en servent ;
 * il ne dit jamais **qui**. Tant qu'ils se comptent sur les doigts, c'est la
 * seule vue qui permette d'écrire à quelqu'un, de comprendre un retour, ou de
 * voir qu'un compte a déposé une fois puis n'est jamais revenu.
 *
 * Séparé de `administration.ts`, qui agrège : ce module-ci énumère, et les deux
 * n'ont ni la même forme de requête ni la même raison de changer.
 *
 * L'écran est derrière `exigerUnAdministrateur`. C'est le seul endroit du
 * produit où une adresse s'affiche en clair, et il n'y en aura pas d'autre.
 */

/** Ce qu'on montre d'un compte. Les compteurs sont des totaux, pas des fenêtres. */
export type CompteInscrit = {
  id: string;
  email: string;
  nom: string;
  /** Une adresse non vérifiée est un compte qui n'a peut-être jamais ouvert son courrier. */
  emailVerifie: boolean;
  inscritLe: Date;
  /** Nul si le compte n'a jamais fait un seul passage. */
  dernierPassage: Date | null;
  depots: number;
  concepts: number;
  serie: number;
  /** Le plan qui vaut à l'instant de la lecture : un terme passé rend au gratuit. */
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

/**
 * Deux cents lignes au plus.
 *
 * La borne n'est pas de la pagination, c'est un garde-fou : cet écran se lit
 * d'un coup d'œil, et le jour où il faudra le paginer, c'est qu'il faudra aussi
 * le repenser. Mieux vaut qu'il tronque visiblement que de rendre une page de
 * quatre mille lignes en silence.
 */
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
    // Le plan se juge ici et pas dans la requête : c'est la règle du domaine, et
    // elle doit rendre la même chose qu'à l'écran de dépôt.
    plan: planEffectif(
      { plan: ligne.plan ?? "GRATUIT", finDePeriode: ligne.currentPeriodEnd },
      maintenant,
    ),
  }));
}
