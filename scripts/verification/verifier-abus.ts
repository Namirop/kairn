import "dotenv/config";
import { conclure, noter } from "./cases/journal";
import { armerLePiegeReseau, noterLesTentativesReseau } from "./cases/piege-reseau";

/**
 * La passe d'audit : abus, quotas, et cycle de vie des concepts.
 *
 * Chaque constat est écrit comme la règle qu'on veut voir tenir : une ligne en
 * ÉCHEC est un trou prouvé à l'exécution, pas une panne de la vérification.
 *
 * Rien ne sort vers l'API : mode mock ; les passages qui le coupent pour compter
 * les appels retirent les clés et pointent sur un port fermé ; le piège sur
 * `fetch`, armé avant le premier import, reste le dernier rempart.
 *
 *   npm run verifier:abus
 */

const tentativesReseau = armerLePiegeReseau();

const COMPTE_A = "verification-abus-a";
const COMPTE_B = "verification-abus-b";

async function main(): Promise<void> {
  process.env.AI_ENABLED = "true";
  process.env.MOCK_AI = "true";

  const { prisma } = await import("@/lib/db/client");
  const { creerCompte, effacerComptes } = await import("./cases/abus-fabrique");
  const cycle = await import("./cases/abus-cycle");
  const regeneration = await import("./cases/abus-regeneration");
  const quotas = await import("./cases/abus-quotas");
  const propriete = await import("./cases/abus-propriete");
  const global = await import("./cases/abus-plafond-global");
  const repli = await import("./cases/abus-repli");

  await effacerComptes([COMPTE_A, COMPTE_B]);

  const a = await creerCompte(COMPTE_A);
  const b = await creerCompte(COMPTE_B);

  // Un instant fixe : la vérification ne dépend pas de l'heure qu'il est.
  const maintenant = new Date("2026-06-15T12:00:00Z");

  try {
    await cycle.casArchivageAutomatique(a, maintenant);
    await cycle.casDesarchivage(a, maintenant);
    await cycle.casModification(a, maintenant);
    await cycle.casModificationPendantSession(a, maintenant);

    await regeneration.casModificationsEnBoucle(a);
    await regeneration.casCorrectionApresDepot(a);
    await regeneration.casModificationReportee(a, maintenant);
    await regeneration.casUsureApresModification(a, maintenant);
    await regeneration.casRedecoupageEnRafale(a);

    await quotas.casDebitConcurrent(a);
    await quotas.casPlafondConcurrent(a);
    await quotas.casDecompteApresExtraction(a);
    await quotas.casRejetEtPanne(a);
    await quotas.casGestesEnRafale(a);
    await quotas.casBornesDentree(a);

    await propriete.casRessourcesDunAutre(a, b, maintenant);

    // Avant les cas du plafond global : `casPartDuCompte` retire en sortant la
    // part par compte de l'environnement, et la configuration ne se valide plus.
    await repli.casRepli();
    await global.casVoisinBloquant(a, b);
    await global.casPartDuCompte(a, b);

    const registre = await prisma.aiCall.count({ where: { userId: { in: [a, b] } } });
    noter(
      "Aucune ligne d'appel ne subsiste au registre après la passe",
      registre === 0,
      `${registre} ligne(s)`,
    );

    noterLesTentativesReseau(tentativesReseau);
  } finally {
    await effacerComptes([COMPTE_A, COMPTE_B]);
  }
}

main()
  .then(() => conclure("Aucun trou trouvé."))
  .catch((error: unknown) => {
    console.error("La vérification a échoué.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.$disconnect();
  });
