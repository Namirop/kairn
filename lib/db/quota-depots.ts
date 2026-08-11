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
const FENETRE_DEBIT_MS = 60 * 1000;
const DEPOTS_PAR_FENETRE = 3;

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
 * L'incrément et le refus tiennent dans une seule instruction : deux dépôts
 * simultanés ne peuvent pas prendre la même place. Le refus porte sur les
 * concepts déjà retenus — un compteur que ce dépôt-ci ne remplira qu'après son
 * extraction, puisqu'on ignore encore ce qu'il rendra.
 *
 * Le dernier dépôt d'une journée peut donc déborder le plafond : il est autorisé
 * tant qu'il reste un concept de marge, et rendra ce qu'il rendra. Réserver une
 * estimation reviendrait à refuser un dépôt d'une ligne parce qu'un article
 * aurait pu tenir à sa place.
 */
export async function reserverDepot(
  userId: string,
  fuseau: string,
  maintenant: Date = new Date(),
): Promise<Autorisation> {
  const recents = await prisma.input.count({
    where: { userId, createdAt: { gte: new Date(maintenant.getTime() - FENETRE_DEBIT_MS) } },
  });

  if (recents >= DEPOTS_PAR_FENETRE) {
    return { accorde: false, motif: "debit", restants: 0 };
  }

  const jour = localDay(maintenant, fuseau);
  const lignes = await prisma.$queryRaw<{ generations: number; concepts: number }[]>`
    INSERT INTO "DailyUsage" ("userId", "day", "generations", "concepts", "reviews", "createdAt", "updatedAt")
    VALUES (${userId}, ${jour}::date, 1, 0, 0, now(), now())
    ON CONFLICT ("userId", "day") DO UPDATE
      SET "generations" = "DailyUsage"."generations" + 1,
          "updatedAt" = now()
      WHERE "DailyUsage"."concepts" < ${CONCEPTS_PAR_JOUR}
        AND "DailyUsage"."generations" < ${DEPOTS_PAR_JOUR}
    RETURNING "generations", "concepts"
  `;

  const prise = lignes[0];

  if (!prise) {
    const usage = await lireUsageDuJour(userId, fuseau, maintenant);

    return {
      accorde: false,
      motif: usage.concepts >= CONCEPTS_PAR_JOUR ? "concepts" : "depots",
      restants: 0,
    };
  }

  return { accorde: true, restants: Math.max(0, CONCEPTS_PAR_JOUR - prise.concepts) };
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
