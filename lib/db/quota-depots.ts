import { prisma } from "@/lib/db/client";
import { localDay } from "@/lib/domain/local-day";

/**
 * Trois limites, trois rôles.
 *
 * **Le quota du jour porte sur les concepts**, pas sur les dépôts. C'est le
 * concept qui coûte — extraction et questions, autour d'un centmillième de
 * dollar près de 0,015 $ — et c'est aussi la bonne unité pour l'utilisateur :
 * quelqu'un qui dépose une phrase ne doit pas consommer autant que quelqu'un
 * qui colle un article. Compter les dépôts faisait payer le geste au lieu de la
 * matière, et un dépôt généraliste rend deux à trois fois plus de concepts
 * qu'un dépôt technique.
 *
 * Le plafond de dépôts reste, en second rideau : chaque dépôt coûte une
 * extraction, quel que soit ce qu'elle rend. Sans lui, cent dépôts d'une ligne
 * tiendraient sous le quota de concepts en payant cent extractions.
 *
 * La limite de débit protège le serveur : elle borne les dépôts rapprochés,
 * indépendamment des deux autres. Elle se lit sur les dépôts eux-mêmes, sans
 * table de plus : ce qui compte est déjà écrit.
 *
 * Les trois se comptent dans le calendrier de l'utilisateur — c'est son minuit
 * qui remet le compteur à zéro, pas celui d'un serveur.
 */

/** Ce qu'une journée permet de retenir. C'est la limite que l'écran annonce. */
export const CONCEPTS_PAR_JOUR = 30;

/** Second rideau : au-delà, ce sont les extractions qu'on paie pour rien. */
export const DEPOTS_PAR_JOUR = 15;

/** Fenêtre courte du débit, et ce qu'on y tolère. */
export const FENETRE_DEBIT_SECONDES = 60;
export const DEPOTS_PAR_FENETRE = 3;

export type Autorisation =
  | { accorde: true; restants: number }
  | { accorde: false; motif: "concepts" | "depots" | "debit"; restants: number };

function jourLocal(instant: Date, fuseau: string): Date {
  return new Date(`${localDay(instant, fuseau)}T00:00:00.000Z`);
}

export type UsageDuJour = { depots: number; concepts: number };

export async function lireUsageDuJour(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<UsageDuJour> {
  const usage = await prisma.dailyUsage.findUnique({
    where: { userId_day: { userId, day: jourLocal(maintenant, fuseau) } },
  });

  return { depots: usage?.generations ?? 0, concepts: usage?.concepts ?? 0 };
}

/**
 * Prend une place du jour, ou la refuse.
 *
 * **Une seule instruction pour les trois limites.** La fenêtre courte se lisait
 * autrefois à part, en comptant les dépôts de la dernière minute avant de
 * décider : c'était exactement la course qu'on avait fermée sur `AiCallQuota`,
 * restée ouverte deux lignes plus haut, et dix envois simultanés lisaient tous
 * zéro. Elle vit maintenant sur la ligne qu'on verrouille pour prendre sa
 * place, donc elle se compte et se refuse dans le même mouvement.
 *
 * Ça règle du même coup le redécoupage, qui prend une place sans écrire de
 * dépôt : compter des `Input` ne le voyait pas, compter des places le voit
 * forcément. Une seule mesure vaut mieux que deux qui doivent s'accorder.
 *
 * Le refus porte sur les concepts déjà retenus — un compteur que ce dépôt-ci ne
 * remplira qu'après son extraction, puisqu'on ignore encore ce qu'il rendra. Le
 * dernier dépôt d'une journée peut donc déborder le plafond : il est autorisé
 * tant qu'il reste un concept de marge, et rendra ce qu'il rendra. Réserver une
 * estimation reviendrait à refuser un dépôt d'une ligne parce qu'un article
 * aurait pu tenir à sa place. C'est pour ce débordement-là que le plafond est
 * annoncé comme approximatif.
 */
export async function reserverDepot(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<Autorisation> {
  const jour = localDay(maintenant, fuseau);
  const lignes = await prisma.$queryRaw<
    { generations: number; concepts: number; depositWindowCount: number }[]
  >`
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
      WHERE "DailyUsage"."concepts" < ${CONCEPTS_PAR_JOUR}
        AND "DailyUsage"."generations" < ${DEPOTS_PAR_JOUR}
        AND (
          "DailyUsage"."depositWindowStart"
            < now() - make_interval(secs => ${FENETRE_DEBIT_SECONDES}::double precision)
          OR "DailyUsage"."depositWindowCount" < ${DEPOTS_PAR_FENETRE}
        )
    RETURNING "generations", "concepts", "depositWindowCount"
  `;

  const prise = lignes[0];

  if (!prise) return { accorde: false, ...(await motifDuRefus(userId, fuseau, maintenant)) };

  return { accorde: true, restants: Math.max(0, CONCEPTS_PAR_JOUR - prise.concepts) };
}

/**
 * Pourquoi la place a été refusée.
 *
 * Lu après coup et non deviné : les trois causes n'appellent pas la même
 * conduite, et « attends une minute » ne se dit pas comme « reviens demain ».
 */
async function motifDuRefus(
  userId: string,
  fuseau: string,
  maintenant: Date,
): Promise<{ motif: "concepts" | "depots" | "debit"; restants: number }> {
  const usage = await lireUsageDuJour(userId, fuseau, maintenant);

  if (usage.concepts >= CONCEPTS_PAR_JOUR) return { motif: "concepts", restants: 0 };
  if (usage.depots >= DEPOTS_PAR_JOUR) return { motif: "depots", restants: 0 };

  return { motif: "debit", restants: Math.max(0, CONCEPTS_PAR_JOUR - usage.concepts) };
}

/** Le dépôt n'a finalement pas été écrit : sa place retourne au compteur. */
export async function rendreDepot(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<void> {
  await prisma.dailyUsage.updateMany({
    where: { userId, day: jourLocal(maintenant, fuseau), generations: { gt: 0 } },
    data: { generations: { decrement: 1 } },
  });
}

/**
 * Les concepts qu'un dépôt vient de rendre entrent au compteur.
 *
 * Écrit après l'extraction, puisque c'est elle qui dit combien. Le jour se
 * recalcule à cet instant-là : un dépôt fait à 23 h 59 dont l'extraction rend à
 * 00 h 01 compte au lendemain, ce qui vaut mieux que de compter dans une journée
 * qui est déjà finie pour son auteur.
 */
export async function compterConceptsRetenus(
  userId: string,
  fuseau: string,
  concepts: number,
  maintenant: Date = new Date(),
): Promise<void> {
  if (concepts <= 0) return;

  const jour = localDay(maintenant, fuseau);

  await prisma.$executeRaw`
    INSERT INTO "DailyUsage" ("userId", "day", "generations", "concepts", "reviews", "createdAt", "updatedAt")
    VALUES (${userId}, ${jour}::date, 0, ${concepts}, 0, now(), now())
    ON CONFLICT ("userId", "day") DO UPDATE
      SET "concepts" = "DailyUsage"."concepts" + ${concepts},
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
