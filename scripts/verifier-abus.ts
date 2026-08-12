import "dotenv/config";
import { conclure, record } from "./verification/journal";

/**
 * La passe d'audit : abus, quotas, et cycle de vie des concepts.
 *
 * Chaque constat est écrit comme la règle qu'on veut voir tenir. Une ligne en
 * ÉCHEC n'est donc pas une panne de la vérification : c'est un trou, prouvé à
 * l'exécution. Ce script est fait pour échouer tant qu'ils ne sont pas bouchés.
 *
 * Rien ne sort vers l'API. Le pipeline tourne en mode mock ; les seuls passages
 * qui coupent le mock — ceux qui comptent des appels — retirent la clé et
 * pointent la base sur un port fermé, et le piège sur `fetch`, armé avant le
 * premier import, reste le dernier rempart.
 *
 *   npm run verify:abus
 */

const tentativesReseau: string[] = [];
const vraiFetch = globalThis.fetch;

globalThis.fetch = function fetchPiege(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : input.toString();

  if (!url.includes("anthropic.com")) return vraiFetch(input, init);

  tentativesReseau.push(url);
  return Promise.reject(new Error(`Requête sortante interdite pendant la vérification : ${url}`));
};

const COMPTE_A = "verification-abus-a";
const COMPTE_B = "verification-abus-b";

async function main(): Promise<void> {
  process.env.AI_ENABLED = "true";
  process.env.MOCK_AI = "true";

  const { prisma } = await import("@/lib/db/client");
  const { creerCompte, effacerComptes } = await import("./verification/abus-fabrique");
  const cycle = await import("./verification/abus-cycle");
  const regeneration = await import("./verification/abus-regeneration");
  const quotas = await import("./verification/abus-quotas");
  const propriete = await import("./verification/abus-propriete");
  const global = await import("./verification/abus-plafond-global");

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

    await global.casVoisinBloquant(a, b);
    await global.casPartDuCompte(a, b);

    const registre = await prisma.aiCall.count({ where: { userId: { in: [a, b] } } });
    record(
      "Aucune ligne d'appel ne subsiste au registre après la passe",
      registre === 0,
      `${registre} ligne(s)`,
    );

    record(
      "Aucune requête n'est sortie vers l'API",
      tentativesReseau.length === 0,
      tentativesReseau.length === 0 ? "zéro tentative" : tentativesReseau.join(", "),
    );
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
