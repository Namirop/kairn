import { prisma } from "@/lib/db/client";
import { periodeDuCompte } from "@/lib/db/periode-du-compte";

/**
 * Ce qui s'ajoute au compteur une fois la dépense faite.
 *
 * L'autre moitié du quota — `quota-depots.ts` — décide **avant** : elle accorde
 * une place ou la refuse, et son résultat change ce qui arrive ensuite. Ici,
 * rien ne se décide. L'extraction a eu lieu, elle a coûté ce qu'elle a coûté,
 * et on enregistre. Un décompte n'a pas de valeur de retour parce qu'il n'a rien
 * à refuser.
 *
 * C'est ce qui permet à un compte de dépasser son plafond à un seul endroit du
 * produit, et de le dépasser légitimement : le dernier dépôt d'une période est
 * autorisé sur une place, puis rend ce qu'il rend.
 */

/**
 * Les concepts qu'un dépôt vient de rendre entrent au compteur.
 *
 * Écrit après l'extraction, puisque c'est elle qui dit combien. La période se
 * recalcule à cet instant-là : un dépôt fait la veille du basculement dont
 * l'extraction rend le lendemain compte sur la période neuve, ce qui vaut mieux
 * que de compter dans une période déjà close.
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
 * Ce qu'un essai fait sans compte prend au compteur, une fois réclamé.
 *
 * Un compte neuf démarrait avec les concepts de son essai **en plus** de ses
 * trente : le chemin anonyme ne passe par aucun quota, et la reprise ne
 * comptait rien. Trois concepts offerts par compte n'est pas ruineux, mais la
 * limite annoncée cessait d'être la limite réelle, et c'est ça qu'on ne veut
 * pas — un plafond qu'on affiche se tient.
 *
 * Le dépôt entre aussi. Le second rideau borne les extractions payées quoi
 * qu'elles rendent, et celle-là l'a été comme les autres.
 *
 * C'est un décompte, pas une réservation : la dépense a déjà eu lieu, il n'y a
 * plus rien à refuser. Un compte peut donc passer au-dessus du plafond à cet
 * instant précis, et c'est le seul endroit où ça arrive.
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
