import { prisma } from "@/lib/db/client";
import {
  creerLeCompteDeDemonstration,
  effacerLeCompteDeDemonstration,
  ADRESSE_DE_DEMONSTRATION,
  FUSEAU_DE_DEMONSTRATION,
} from "./seed/compte-de-demonstration";
import { CORPUS } from "./seed/corpus";
import { ecrireLeCorpus } from "./seed/ecriture-du-corpus";
import {
  ecrireLesAppels,
  ecrireLUsageQuotidien,
  ecrireLesDepotsSansConcept,
} from "./seed/registre";
import { ecrireLesCompteurs } from "./seed/compteurs";

/**
 * Remplit la base avec un compte de démonstration et deux mois d'usage
 * plausible (voir `seed/corpus.ts`) : des échéances dépassées et à venir, un
 * historique rejoué par ts-fsrs, un dépôt en échec. De quoi regarder toute
 * l'interface sans appeler le modèle.
 */
async function main(): Promise<void> {
  const maintenant = new Date();

  await effacerLeCompteDeDemonstration();
  const userId = await creerLeCompteDeDemonstration();

  const { reviewedAt, atomsConsolidated } = await ecrireLeCorpus(userId, CORPUS, maintenant);
  await ecrireLesDepotsSansConcept(userId, maintenant);
  await ecrireLesAppels(userId, maintenant);
  await ecrireLUsageQuotidien(userId, FUSEAU_DE_DEMONSTRATION, reviewedAt);
  await ecrireLesCompteurs(
    userId,
    FUSEAU_DE_DEMONSTRATION,
    reviewedAt,
    atomsConsolidated,
    maintenant,
  );

  const [atomes, variantes, dus] = await Promise.all([
    prisma.atom.count({ where: { userId } }),
    prisma.variant.count({ where: { atom: { userId } } }),
    prisma.atom.count({
      where: { userId, due: { lte: maintenant }, state: { not: "ARCHIVED" } },
    }),
  ]);

  console.info(
    `Seed écrit pour ${ADRESSE_DE_DEMONSTRATION} — ${atomes} Atoms, ${variantes} Variants, ` +
      `${reviewedAt.length} Reviews, ${atomsConsolidated} consolidés, ${dus} dus aujourd'hui.`,
  );
}

main()
  .catch((erreur: unknown) => {
    console.error("Le seed a échoué.", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
