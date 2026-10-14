import { prisma } from "@/lib/db/client";
import { jourLocal } from "@/lib/domain/jour-local";

/**
 * La limite de débit des gestes de révision (répondre, s'entraîner, demander un
 * tour) : ils ne coûtent aucun appel modèle, mais écrivent en base, et une
 * boucle côté client n'aurait rien devant elle. Elle protège le serveur à la
 * minute.
 *
 * Même mécanisme que la fenêtre des dépôts : la fenêtre vit sur la ligne qu'on
 * verrouille, pour que compter et refuser tiennent dans une seule instruction.
 */

/** Fenêtre courte, et ce qu'on y tolère. */
export const FENETRE_GESTES_SECONDES = 60;

/**
 * Large à dessein : une session plafonne à vingt questions par défaut et un tour
 * à douze. Personne n'approche ce chiffre au clavier, une boucle le franchit à
 * la première seconde.
 */
export const GESTES_PAR_FENETRE = 120;

/**
 * Prend une place dans la fenêtre des gestes, ou la refuse. La ligne est celle
 * du jour local de l'utilisateur ; la fenêtre, elle, glisse.
 */
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
