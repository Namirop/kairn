import { prisma } from "@/lib/db/client";
import { localDay } from "@/lib/domain/local-day";

/**
 * La limite de débit des gestes de révision.
 *
 * Répondre, s'entraîner, demander un tour de plus : aucun de ces gestes ne coûte
 * un appel modèle, et aucun n'était borné. Deux écritures par réponse, sans
 * limite, et un tour d'entraînement qui lit tout le corpus du compte — une
 * boucle côté client n'avait rien devant elle.
 *
 * Le quota protège le budget sur la journée, cette limite protège le serveur sur
 * la minute. Les deux sont nécessaires et ne se remplacent pas.
 *
 * Même mécanisme que la fenêtre des dépôts, et pour la même raison : la fenêtre
 * vit sur la ligne qu'on verrouille, donc compter et refuser tiennent dans une
 * seule instruction. Un compteur lu puis écrit laisse passer tout ce qui part
 * ensemble.
 */

/** Fenêtre courte, et ce qu'on y tolère. */
export const FENETRE_GESTES_SECONDES = 60;

/**
 * Large à dessein. Une session plafonne à vingt questions et un tour
 * d'entraînement à douze : personne n'approche ce chiffre au clavier, et une
 * boucle le franchit à la première seconde. Une limite de débit n'a pas à
 * arbitrer l'usage, seulement à casser ce qui n'en est pas.
 */
export const GESTES_PAR_FENETRE = 120;

/**
 * Prend une place dans la fenêtre des gestes, ou la refuse.
 *
 * Le jour de la ligne est celui de l'utilisateur, comme pour les dépôts : c'est
 * son minuit qui remet les compteurs à zéro. La fenêtre, elle, glisse — elle ne
 * s'aligne sur rien.
 */
export async function prendreUnGeste(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<boolean> {
  const jour = localDay(maintenant, fuseau);
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
