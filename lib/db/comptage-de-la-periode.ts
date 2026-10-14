import { prisma } from "@/lib/db/client";
import { periodeDuCompte } from "@/lib/db/periode-du-compte";

/**
 * Ce qui s'ajoute au compteur une fois la dépense faite. La décision se prend
 * avant, dans `quota-depots.ts` ; ici rien n'est refusé, d'où l'absence de
 * valeur de retour, et un compte peut donc dépasser son plafond.
 */

/**
 * Les concepts qu'un dépôt vient de rendre entrent au compteur. La période se
 * recalcule à cet instant : une extraction qui rend après le basculement compte
 * sur la période neuve.
 */
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
 * Ce qu'un essai fait sans compte prend au compteur, une fois réclamé. Le
 * chemin anonyme ne passe par aucun quota : sans ce décompte, l'essai
 * s'ajouterait au plafond affiché. Le dépôt entre aussi, son extraction a été
 * payée comme les autres.
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
