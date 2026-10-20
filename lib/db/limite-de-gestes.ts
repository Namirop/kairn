import { prisma } from "@/lib/db/client";
import { jourLocal } from "@/lib/domain/jour-local";

/**
 * Les gestes de révision ne coûtent aucun appel mais écrivent en base : sans
 * limite, une boucle côté client n'aurait rien devant elle. Comme pour les
 * dépôts, la fenêtre vit sur la ligne verrouillée : compter et refuser tiennent
 * en une instruction.
 */

export const FENETRE_GESTES_SECONDES = 60;

/**
 * Large à dessein (session de vingt par défaut, tour de douze) : personne ne
 * l'approche au clavier, une boucle le franchit à la première seconde.
 */
export const GESTES_PAR_FENETRE = 120;

/** La ligne est celle du jour local ; la fenêtre, elle, glisse. */
export async function prendreUnGeste(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<boolean> {
  const jour = jourLocal(maintenant, fuseau);
  const lignes = await prisma.$queryRaw<{ actionWindowCount: number }[]>`
    INSERT INTO "DailyUsage" (
      "userId", "day", "generations", "concepts", "reviews",
      "depositWindowStart", "depositWindowCount",
      "actionWindowStart", "actionWindowCount",
      "createdAt", "updatedAt"
    )
    VALUES (${userId}, ${jour}::date, 0, 0, 1, now(), 0, now(), 1, now(), now())
    ON CONFLICT ("userId", "day") DO UPDATE
      SET "reviews" = "DailyUsage"."reviews" + 1,
          "actionWindowStart" = CASE
            WHEN "DailyUsage"."actionWindowStart"
                 < now() - make_interval(secs => ${FENETRE_GESTES_SECONDES}::double precision)
            THEN now() ELSE "DailyUsage"."actionWindowStart" END,
          "actionWindowCount" = CASE
            WHEN "DailyUsage"."actionWindowStart"
                 < now() - make_interval(secs => ${FENETRE_GESTES_SECONDES}::double precision)
            THEN 1 ELSE "DailyUsage"."actionWindowCount" + 1 END,
          "updatedAt" = now()
      WHERE "DailyUsage"."actionWindowStart"
              < now() - make_interval(secs => ${FENETRE_GESTES_SECONDES}::double precision)
        OR "DailyUsage"."actionWindowCount" < ${GESTES_PAR_FENETRE}
    RETURNING "actionWindowCount"
  `;

  return lignes.length > 0;
}
