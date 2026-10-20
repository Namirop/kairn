import { prisma } from "@/lib/db/client";
import { periodeDuCompte } from "@/lib/db/periode-du-compte";

/**
 * Après la dépense ; la décision se prend avant, dans `quota-depots.ts`. Rien
 * n'est refusé ici : un compte peut dépasser son plafond.
 */

/** Période recalculée maintenant : rendu après la bascule, il compte sur la neuve. */
export async function compterConceptsRetenus(
  userId: string,
  fuseau: string,
  concepts: number,
  maintenant: Date = new Date(),
): Promise<void> {
  if (concepts <= 0) return;

  const periode = await periodeDuCompte(userId, fuseau, maintenant);

  await prisma.$executeRaw`
    INSERT INTO "MonthlyUsage" ("userId", "periodStart", "concepts", "deposits", "createdAt", "updatedAt")
    VALUES (${userId}, ${periode.debut}::date, ${concepts}, 0, now(), now())
    ON CONFLICT ("userId", "periodStart") DO UPDATE
      SET "concepts" = "MonthlyUsage"."concepts" + ${concepts},
          "updatedAt" = now()
  `;
}

/**
 * Le chemin anonyme ne passe par aucun quota : sans ce décompte, l'essai
 * s'ajouterait au plafond. Le dépôt compte aussi : son extraction a été payée.
 */
export async function compterLaVisiteReprise(
  userId: string,
  fuseau: string,
  concepts: number,
  maintenant: Date = new Date(),
): Promise<void> {
  const periode = await periodeDuCompte(userId, fuseau, maintenant);
  const retenus = Math.max(concepts, 0);

  await prisma.$executeRaw`
    INSERT INTO "MonthlyUsage" ("userId", "periodStart", "concepts", "deposits", "createdAt", "updatedAt")
    VALUES (${userId}, ${periode.debut}::date, ${retenus}, 1, now(), now())
    ON CONFLICT ("userId", "periodStart") DO UPDATE
      SET "concepts" = "MonthlyUsage"."concepts" + ${retenus},
          "deposits" = "MonthlyUsage"."deposits" + 1,
          "updatedAt" = now()
  `;
}
