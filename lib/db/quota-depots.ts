import { plafondDuCompte } from "@/lib/db/abonnement";
import { plafondDeDepots } from "@/lib/domain/plafond-du-plan";
import { prisma } from "@/lib/db/client";
import { lireUsageDeLaPeriode, periodeDuCompte } from "@/lib/db/periode-du-compte";
import { jourLocal } from "@/lib/domain/jour-local";
import { debutEnDate } from "@/lib/domain/periode-de-quota";

/**
 * Seul module qui puisse refuser une place, **avant** la dépense (lecture :
 * `periode-du-compte.ts`, décompte : `comptage-de-la-periode.ts`). Trois limites :
 * - concepts au mois, période ancrée à l'inscription : plafond commercial, pas
 *   de coût (~0,004 $ le dépôt complet) ;
 * - dépôts au mois : un rejet paie son extraction sans rendre de concept ;
 * - débit à la minute, pour le serveur. Il vit dans la ligne verrouillée pour
 *   que l'incrément et le refus tiennent en une instruction : ne pas l'en sortir.
 */

export const FENETRE_DEBIT_SECONDES = 60;
export const DEPOTS_PAR_FENETRE = 3;

export type Autorisation =
  | { accorde: true; restants: number }
  | {
      accorde: false;
      motif: "concepts" | "depots" | "debit";
      restants: number;
      /** Celle qui a décidé : une relecture en base pourrait rendre autre chose. */
      plafond: number;
    };

/**
 * Chaque compteur s'incrémente et refuse en une instruction (lu puis écrit, il
 * laisserait passer les envois simultanés). La période d'abord, rendue si le
 * débit refuse : dans l'autre ordre, un mois plein brûlerait un jeton de débit.
 * Ce dépôt ne compte ses concepts qu'après extraction : le dernier de la période
 * peut déborder, d'où un plafond annoncé comme approximatif.
 */
export async function reserverDepot(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<Autorisation> {
  const periode = await periodeDuCompte(userId, fuseau, maintenant);
  const debut = periode.debut;
  // Lu une fois : un abonnement pris entre deux lectures fausserait le refus.
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
 * Sur la ligne du jour : compter à part serait une course (les envois
 * simultanés liraient zéro). Un redécoupage, sans dépôt écrit, y entre aussi.
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

/** Relu après coup : les deux causes ne s'annoncent pas de la même façon. */
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

/** Pour un dépôt finalement pas écrit. */
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
