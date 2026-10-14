import { plafondDuCompte } from "@/lib/db/abonnement";
import { plafondDeDepots } from "@/lib/domain/plafond-du-plan";
import { prisma } from "@/lib/db/client";
import { lireUsageDeLaPeriode, periodeDuCompte } from "@/lib/db/periode-du-compte";
import { jourLocal } from "@/lib/domain/jour-local";
import { debutEnDate } from "@/lib/domain/periode-de-quota";

/**
 * Prendre une place de la période, ou la refuser, **avant** la dépense. La
 * lecture vit dans `periode-du-compte.ts`, le décompte après coup dans
 * `comptage-de-la-periode.ts` ; ce module est le seul qui puisse dire non.
 *
 * Trois limites, qui ne se remplacent pas :
 * - le plafond de concepts, au mois, sur une période ancrée au jour
 *   d'inscription. C'est un plafond commercial, pas de coût (un dépôt complet
 *   coûte ~0,004 $) : le monter ne met aucun budget en danger ;
 * - le plafond de dépôts, au mois aussi : un dépôt rejeté paie son extraction
 *   sans rendre de concept, donc échappe au premier. Sa valeur se dérive du
 *   plafond du compte, voir `plafondDeDepots` ;
 * - la fenêtre de débit, à la minute, qui protège le serveur. Elle vit dans la
 *   ligne qu'on verrouille pour que l'incrément et le refus tiennent dans la
 *   même instruction : ne pas la sortir dans une requête à part.
 */

/** Fenêtre courte du débit, et ce qu'on y tolère. */
export const FENETRE_DEBIT_SECONDES = 60;
export const DEPOTS_PAR_FENETRE = 3;

export type Autorisation =
  | { accorde: true; restants: number }
  | {
      accorde: false;
      motif: "concepts" | "depots" | "debit";
      restants: number;
      /**
       * La limite qui a refusé. Portée par le refus pour que le message dise
       * celle qui a décidé : une relecture en base pourrait rendre autre chose.
       */
      plafond: number;
    };

/**
 * Prend une place de la période, ou la refuse.
 *
 * Deux compteurs, chacun incrémenté et refusé d'une seule instruction (un
 * compteur lu puis écrit laisse passer les envois simultanés). La période
 * d'abord, la fenêtre de débit ensuite, et la place est rendue si la fenêtre
 * refuse : dans l'ordre inverse, un mois plein consommerait aussi un jeton de
 * débit.
 *
 * Le refus porte sur les concepts déjà retenus ; ce dépôt-ci ne compte qu'après
 * son extraction. Le dernier dépôt d'une période peut donc déborder le plafond,
 * et il est annoncé comme approximatif.
 */
export async function reserverDepot(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<Autorisation> {
  const periode = await periodeDuCompte(userId, fuseau, maintenant);
  const debut = periode.debut;
  // Lu une fois, puis porté jusqu'au refus : un abonnement qui commence entre
  // deux lectures ferait annoncer une limite qui n'est pas celle qui a décidé.
  const plafond = await plafondDuCompte(userId, maintenant);

  const lignes = await prisma.$queryRaw<{ deposits: number; concepts: number }[]>`
    INSERT INTO "MonthlyUsage" ("userId", "periodStart", "concepts", "deposits", "createdAt", "updatedAt")
    VALUES (${userId}, ${debut}::date, 0, 1, now(), now())
    ON CONFLICT ("userId", "periodStart") DO UPDATE
      SET "deposits" = "MonthlyUsage"."deposits" + 1,
          "updatedAt" = now()
      WHERE "MonthlyUsage"."concepts" < ${plafond}
        AND "MonthlyUsage"."deposits" < ${plafondDeDepots(plafond)}
    RETURNING "deposits", "concepts"
  `;

  const prise = lignes[0];

  if (!prise) {
    return {
      accorde: false,
      ...(await motifDuRefus(userId, fuseau, plafond, maintenant)),
      plafond,
    };
  }

  if (await fenetreDeDebitOuverte(userId, fuseau, maintenant)) {
    return { accorde: true, restants: Math.max(0, plafond - prise.concepts) };
  }

  await rendreDepot(userId, fuseau, maintenant);

  return {
    accorde: false,
    motif: "debit",
    restants: Math.max(0, plafond - prise.concepts),
    plafond,
  };
}

/**
 * La fenêtre courte, sur la ligne du jour. Compter les dépôts récents dans une
 * requête à part serait une course (des envois simultanés lisent tous zéro).
 * Un redécoupage, qui n'écrit aucun dépôt, y entre au même titre.
 */
async function fenetreDeDebitOuverte(
  userId: string,
  fuseau: string,
  maintenant: Date,
): Promise<boolean> {
  const jour = jourLocal(maintenant, fuseau);
  const lignes = await prisma.$queryRaw<{ depositWindowCount: number }[]>`
    INSERT INTO "DailyUsage" (
      "userId", "day", "generations", "concepts", "reviews",
      "depositWindowStart", "depositWindowCount",
      "actionWindowStart", "actionWindowCount",
      "createdAt", "updatedAt"
    )
    VALUES (${userId}, ${jour}::date, 1, 0, 0, now(), 1, now(), 0, now(), now())
    ON CONFLICT ("userId", "day") DO UPDATE
      SET "generations" = "DailyUsage"."generations" + 1,
          "depositWindowStart" = CASE
            WHEN "DailyUsage"."depositWindowStart"
                 < now() - make_interval(secs => ${FENETRE_DEBIT_SECONDES}::double precision)
            THEN now() ELSE "DailyUsage"."depositWindowStart" END,
          "depositWindowCount" = CASE
            WHEN "DailyUsage"."depositWindowStart"
                 < now() - make_interval(secs => ${FENETRE_DEBIT_SECONDES}::double precision)
            THEN 1 ELSE "DailyUsage"."depositWindowCount" + 1 END,
          "updatedAt" = now()
      WHERE "DailyUsage"."depositWindowStart"
              < now() - make_interval(secs => ${FENETRE_DEBIT_SECONDES}::double precision)
        OR "DailyUsage"."depositWindowCount" < ${DEPOTS_PAR_FENETRE}
    RETURNING "depositWindowCount"
  `;

  return lignes.length > 0;
}

/**
 * Pourquoi la place a été refusée, relu après coup : les deux causes ne
 * s'annoncent pas de la même façon.
 */
async function motifDuRefus(
  userId: string,
  fuseau: string,
  plafond: number,
  maintenant: Date,
): Promise<{ motif: "concepts" | "depots"; restants: number }> {
  const usage = await lireUsageDeLaPeriode(userId, fuseau, maintenant);

  if (usage.concepts >= plafond) return { motif: "concepts", restants: 0 };

  return { motif: "depots", restants: Math.max(0, plafond - usage.concepts) };
}

/** Le dépôt n'a finalement pas été écrit : sa place retourne au compteur. */
export async function rendreDepot(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<void> {
  const periode = await periodeDuCompte(userId, fuseau, maintenant);

  await prisma.monthlyUsage.updateMany({
    where: { userId, periodStart: debutEnDate(periode), deposits: { gt: 0 } },
    data: { deposits: { decrement: 1 } },
  });
}
