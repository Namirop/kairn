import { prisma } from "@/lib/db/client";
import { jourEnDateUtc, jourLocal } from "@/lib/domain/jour-local";
import type { CompteurDeQuota } from "@/lib/db/types";

/**
 * Le verrou d'une alerte de plafond : elle part une fois par jour et par seuil,
 * pas à chaque appel suivant. C'est l'insertion elle-même qui verrouille (la clé primaire
 * refuse les suivantes), pas un drapeau lu puis écrit, que deux réservations
 * simultanées passeraient toutes les deux.
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
 * journée se compte en UTC comme les compteurs surveillés, sinon l'alerte
 * repartirait au milieu d'une journée déjà signalée.
 */
export async function reserverLAlerte(
  cle: CleDAlerte,
  maintenant: Date = new Date(),
): Promise<boolean> {
  const { count } = await prisma.alerteQuota.createMany({
    data: {
      day: jourEnDateUtc(jourLocal(maintenant, "UTC")),
      compteur: cle.compteur,
      cible: cle.cible,
      seuil: cle.seuil,
    },
    skipDuplicates: true,
  });

  return count === 1;
}
