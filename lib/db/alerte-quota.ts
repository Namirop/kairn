import { prisma } from "@/lib/db/client";
import { dayToUtcDate, localDay } from "@/lib/domain/local-day";
import type { CompteurDeQuota } from "@/lib/db/types";

/**
 * Le verrou d'une alerte de plafond : elle part une fois, ou pas du tout.
 *
 * Sans lui, un plafond franchi au trente-cinquième appel enverrait un email à
 * chaque appel suivant. Le verrou n'est pas un drapeau qu'on lit puis qu'on
 * écrit — entre les deux, deux réservations simultanées décideraient toutes les
 * deux d'envoyer. C'est **l'insertion elle-même** qui verrouille : elle réussit
 * une fois, la clé primaire refuse les suivantes, et le refus est la réponse.
 */

export type CleDAlerte = {
  compteur: CompteurDeQuota;
  /** Le compte concerné, ou la chaîne vide pour un compteur qui n'en vise aucun. */
  cible: string;
  seuil: number;
};

/**
 * Prend l'alerte pour la journée en cours, si personne ne l'a déjà prise.
 *
 * Rend vrai à l'appelant qui a gagné, et à lui seul : c'est lui qui envoie. La
 * journée se compte en UTC comme les compteurs qu'elle surveille — deux fenêtres
 * qui se ferment à des instants différents dérivent l'une de l'autre, et
 * l'alerte se remettrait à partir au milieu d'une journée déjà signalée.
 */
export async function reserverLAlerte(
  cle: CleDAlerte,
  maintenant: Date = new Date(),
): Promise<boolean> {
  const { count } = await prisma.alerteQuota.createMany({
    data: {
      day: dayToUtcDate(localDay(maintenant, "UTC")),
      compteur: cle.compteur,
      cible: cle.cible,
      seuil: cle.seuil,
    },
    skipDuplicates: true,
  });

  return count === 1;
}
