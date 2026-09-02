import { plafondDuCompte } from "@/lib/db/abonnement";
import { plafondDeDepots } from "@/lib/domain/plafond-du-plan";
import { prisma } from "@/lib/db/client";
import { lireUsageDeLaPeriode, periodeDuCompte } from "@/lib/db/periode-du-compte";
import { localDay } from "@/lib/domain/local-day";
import { debutEnDate } from "@/lib/domain/periode-de-quota";

/**
 * Prendre une place de la période, ou la refuser.
 *
 * Ce module décide **avant** la dépense. Ce qui la lit vit dans
 * `periode-du-compte.ts`, ce qui l'enregistre après coup dans
 * `comptage-de-la-periode.ts` : trois rôles, et celui-ci est le seul qui puisse
 * dire non.
 *
 * Il tient d'un bloc et ne se découpe pas plus loin. La fenêtre de débit n'est
 * pas une limite à part rangée ailleurs : elle vit dans la ligne qu'on
 * verrouille, sans quoi l'incrément et le refus ne tiendraient plus dans la
 * même instruction — et c'est exactement le bug qu'elle a corrigé, dix envois
 * simultanés qui lisaient tous zéro.
 *
 * Trois limites, trois rôles.
 *
 * **Le plafond porte sur les concepts, et il se compte au mois**, sur une
 * période ancrée au jour d'inscription.
 *
 * C'est la bonne unité pour l'utilisateur : quelqu'un qui dépose une phrase ne
 * doit pas consommer autant que quelqu'un qui colle un article. Ça reste vrai.
 *
 * **Mais ce plafond n'est plus une contrainte de coût, et il ne faut pas le
 * relire comme telle.** Il l'a été : au tarif Sonnet, ce commentaire annonçait
 * une trentaine de dollars par mois pour un compte qui saturait tous les jours,
 * et trente concepts par mois ramenaient ce maximum sous le demi-dollar. Depuis
 * le passage à `gpt-5.6-luna`, un dépôt complet — son extraction et ses quatre
 * questions — coûte **0,004 $** : mesuré au registre le 01/09/2026, pas estimé.
 * Une période gratuite saturée coûte donc quelques centimes.
 *
 * Ce qui reste est un plafond **commercial**, et c'est ce qu'il faut assumer en
 * le changeant : le monter ne met plus aucun budget en danger, le tenir bas est
 * une décision de prix. Le plan payant s'y branche en le remplaçant.
 *
 * Le plafond de dépôts reste en second rideau, et il passe au mois lui aussi :
 * chaque dépôt paie une extraction quoi qu'elle rende, et un dépôt rejeté n'en
 * rend aucun. Le laisser au jour aurait fait un second rideau trente fois plus
 * lâche que ce qu'il couvre.
 *
 * La limite de débit, elle, reste courte et inchangée : elle protège le serveur
 * sur la minute, pas le budget sur le mois. Les deux sont nécessaires et ne se
 * remplacent pas.
 */

/**
 * Ce qu'une période permet de retenir, c'est le plan du compte qui le dit.
 *
 * C'était une constante ; `lib/domain/plafond-du-plan.ts` la remplace, et le
 * plafond se lit désormais par compte. Rien ici ne connaît les plans ni leurs
 * valeurs : ce module réserve des places, il ne décide pas combien il y en a.
 */

/**
 * Second rideau : au-delà, ce sont les extractions qu'on paie pour rien.
 *
 * C'est le seul endroit où la longueur d'un texte échappe au quota en concepts.
 * Un dépôt rejeté paie son extraction et ne rend aucun concept : il n'entre donc
 * jamais dans le compteur que le plafond de concepts surveille, et sans ce
 * rideau-là quelqu'un pourrait ne déposer que des textes rejetés, sans fin.
 *
 * L'ordre de grandeur vient de là : soixante extractions de 8 000 caractères,
 * autour de 2 400 tokens d'entrée chacune. Elles coûtaient près de **0,45 $** au
 * tarif Sonnet ; au tarif Luna elles en coûtent **une trentaine de fois moins**.
 * Comme le plafond de concepts, ce rideau ne protège plus un budget — il protège
 * contre l'abus, ce qui est un autre métier.
 *
 * **Le nombre n'est plus écrit ici**, il se dérive du plafond du compte : voir
 * `plafondDeDepots` dans le domaine, qui dit pourquoi un rideau figé annulait
 * l'offre payante.
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
       * La limite qui a refusé, portée par le refus.
       *
       * Le message qui l'annonce est écrit ailleurs, et il doit dire le plafond
       * de *ce* compte. Le lui faire relire en base serait une seconde lecture
       * qui peut ne pas rendre la même chose que celle qui vient de décider.
       */
      plafond: number;
    };

/**
 * Prend une place de la période, ou la refuse.
 *
 * Deux compteurs, deux instructions, dans cet ordre : le budget de la période
 * d'abord, la fenêtre de débit ensuite. Chacune incrémente et refuse d'un seul
 * mouvement — un compteur lu puis écrit laisse passer tout ce qui part ensemble.
 *
 * Si la fenêtre refuse, la place de la période est rendue. L'ordre inverse
 * aurait laissé un refus de budget consommer un jeton de débit, ce qui aurait
 * fait payer une minute d'attente à quelqu'un dont le mois est plein — deux
 * punitions pour une seule limite.
 *
 * Le refus porte sur les concepts déjà retenus, un compteur que ce dépôt-ci ne
 * remplira qu'après son extraction : on ignore encore ce qu'il rendra. Le dernier
 * dépôt d'une période peut donc déborder le plafond, et c'est pour ça qu'il est
 * annoncé comme approximatif.
 */
export async function reserverDepot(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<Autorisation> {
  const periode = await periodeDuCompte(userId, fuseau, maintenant);
  const debut = periode.debut;
  // Lu une fois, puis porté jusqu'au refus. Le relire après coup pourrait rendre
  // une autre valeur — un abonnement qui commence entre les deux lectures — et
  // le message annoncerait alors une limite qui n'est pas celle qui a décidé.
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
 * La fenêtre courte, sur la ligne du jour.
 *
 * Elle vit là et pas dans une requête à part : compter les dépôts récents avant
 * de décider était une course, et dix envois simultanés lisaient tous zéro. Ici,
 * la fenêtre est dans la ligne qu'on verrouille, donc l'incrément et le refus
 * tiennent dans la même instruction. Un redécoupage, qui n'écrit aucun dépôt, y
 * entre au même titre : c'est la place qui compte, pas la trace qu'elle laisse.
 */
async function fenetreDeDebitOuverte(
  userId: string,
  fuseau: string,
  maintenant: Date,
): Promise<boolean> {
  const jour = localDay(maintenant, fuseau);
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
 * Pourquoi la place a été refusée.
 *
 * Lu après coup et non deviné : les deux causes n'appellent pas la même conduite,
 * et « tu as fait tous tes dépôts » ne se dit pas comme « tu as retenu tout ce
 * que la période permet ».
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
