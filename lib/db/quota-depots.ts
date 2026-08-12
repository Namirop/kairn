import { prisma } from "@/lib/db/client";
import { localDay } from "@/lib/domain/local-day";
import { debutEnDate, periodeDeQuota, type PeriodeDeQuota } from "@/lib/domain/periode-de-quota";

/**
 * Trois limites, trois rôles.
 *
 * **Le plafond porte sur les concepts, et il se compte au mois**, sur une
 * période ancrée au jour d'inscription. Trente par jour tenaient tant que le
 * produit ne servait qu'à son auteur ; ouvert à tous, un compte gratuit qui
 * sature quotidiennement coûterait une trentaine de dollars par mois. Trente par
 * mois ramène ce maximum sous le demi-dollar, et c'est ce qui rend l'ouverture
 * possible.
 *
 * C'est le concept qui coûte — extraction et questions, autour de 0,015 $ — et
 * c'est aussi la bonne unité pour l'utilisateur : quelqu'un qui dépose une
 * phrase ne doit pas consommer autant que quelqu'un qui colle un article.
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

/** Ce qu'une période permet de retenir. C'est la limite que l'écran annonce. */
export const CONCEPTS_PAR_PERIODE = 30;

/**
 * Second rideau : au-delà, ce sont les extractions qu'on paie pour rien.
 *
 * Le double du plafond de concepts. Un dépôt rend un à huit concepts, donc
 * trente concepts s'atteignent en cinq dépôts d'article comme en trente dépôts
 * d'une phrase ; soixante laisse la place aux deux usages et borne à 0,30 $ ce
 * que coûterait quelqu'un qui ne déposerait que des textes rejetés.
 */
export const DEPOTS_PAR_PERIODE = 60;

/** Fenêtre courte du débit, et ce qu'on y tolère. */
export const FENETRE_DEBIT_SECONDES = 60;
export const DEPOTS_PAR_FENETRE = 3;

export type Autorisation =
  | { accorde: true; restants: number }
  | { accorde: false; motif: "concepts" | "depots" | "debit"; restants: number };

/**
 * La période en cours d'un compte.
 *
 * L'ancrage est la date d'inscription. Un compte introuvable — supprimé entre
 * deux requêtes — ancre sur maintenant : il n'obtiendra rien de toute façon,
 * autant que le calcul ne lève pas.
 */
export async function periodeDuCompte(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<PeriodeDeQuota> {
  const compte = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  return periodeDeQuota(compte?.createdAt ?? maintenant, maintenant, fuseau);
}

export type UsageDeLaPeriode = {
  depots: number;
  concepts: number;
  periode: PeriodeDeQuota;
};

export async function lireUsageDeLaPeriode(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<UsageDeLaPeriode> {
  const periode = await periodeDuCompte(userId, fuseau, maintenant);
  const usage = await prisma.monthlyUsage.findUnique({
    where: { userId_periodStart: { userId, periodStart: debutEnDate(periode) } },
  });

  return { depots: usage?.deposits ?? 0, concepts: usage?.concepts ?? 0, periode };
}

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

  const lignes = await prisma.$queryRaw<{ deposits: number; concepts: number }[]>`
    INSERT INTO "MonthlyUsage" ("userId", "periodStart", "concepts", "deposits", "createdAt", "updatedAt")
    VALUES (${userId}, ${debut}::date, 0, 1, now(), now())
    ON CONFLICT ("userId", "periodStart") DO UPDATE
      SET "deposits" = "MonthlyUsage"."deposits" + 1,
          "updatedAt" = now()
      WHERE "MonthlyUsage"."concepts" < ${CONCEPTS_PAR_PERIODE}
        AND "MonthlyUsage"."deposits" < ${DEPOTS_PAR_PERIODE}
    RETURNING "deposits", "concepts"
  `;

  const prise = lignes[0];

  if (!prise) return { accorde: false, ...(await motifDuRefus(userId, fuseau, maintenant)) };

  if (await fenetreDeDebitOuverte(userId, fuseau, maintenant)) {
    return { accorde: true, restants: Math.max(0, CONCEPTS_PAR_PERIODE - prise.concepts) };
  }

  await rendreDepot(userId, fuseau, maintenant);

  return {
    accorde: false,
    motif: "debit",
    restants: Math.max(0, CONCEPTS_PAR_PERIODE - prise.concepts),
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
  maintenant: Date,
): Promise<{ motif: "concepts" | "depots"; restants: number }> {
  const usage = await lireUsageDeLaPeriode(userId, fuseau, maintenant);

  if (usage.concepts >= CONCEPTS_PAR_PERIODE) return { motif: "concepts", restants: 0 };

  return { motif: "depots", restants: Math.max(0, CONCEPTS_PAR_PERIODE - usage.concepts) };
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

export async function inscrireEnListeDattente(userId: string, motif?: string): Promise<void> {
  await prisma.waitlistEntry.upsert({
    where: { userId },
    create: { userId, motif: motif ?? null },
    update: { motif: motif ?? null },
  });
}

export async function estEnListeDattente(userId: string): Promise<boolean> {
  return (await prisma.waitlistEntry.count({ where: { userId } })) > 0;
}
