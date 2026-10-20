import { prisma } from "@/lib/db/client";
import { jourEnDateUtc, jourLocal } from "@/lib/domain/jour-local";
import type { CompteurDeQuota } from "@/lib/db/types";

/**
 * Une alerte par jour et par seuil. L'insertion verrouille (la clé primaire
 * refuse les suivantes) : un drapeau lu puis écrit laisserait passer deux
 * réservations simultanées.
 */

export type CleDAlerte = {
  compteur: CompteurDeQuota;
  /** Chaîne vide pour un compteur qui ne vise aucun compte. */
  cible: string;
  seuil: number;
};

/**
 * Vrai pour le seul gagnant, qui envoie. Jour UTC comme les compteurs
 * surveillés, sinon l'alerte repartirait au milieu d'une journée signalée.
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
