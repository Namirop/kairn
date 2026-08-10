import "dotenv/config";
import { conclure, record } from "./verification/journal";

/**
 * Preuve, à l'exécution, que l'ingestion tient de bout en bout : un dépôt entre,
 * ses concepts puis ses questions sortent, et rien ne part vers l'API.
 *
 * Tout se joue en mode mock, sur un utilisateur de vérification créé pour
 * l'occasion et effacé à la fin. Le piège sur `fetch` est armé avant le premier
 * import : une sortie réseau vers l'API ferait échouer la vérification au lieu
 * de coûter quelque chose.
 *
 *   npm run verify:ingestion
 */

const tentativesReseau: string[] = [];
const vraiFetch = globalThis.fetch;

globalThis.fetch = function fetchPiege(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : input.toString();

  if (!url.includes("anthropic.com")) return vraiFetch(input, init);

  tentativesReseau.push(url);
  return Promise.reject(new Error(`Requête sortante interdite pendant la vérification : ${url}`));
};

/** Une capture minuscule mais réelle : c'est sharp qui la relit ensuite. */
async function captureDeTest(): Promise<File> {
  const sharp = (await import("sharp")).default;
  const png = await sharp({
    create: { width: 320, height: 180, channels: 3, background: "#16191A" },
  })
    .png()
    .toBuffer();

  return new File([new Uint8Array(png)], "capture.png", { type: "image/png" });
}

async function main(): Promise<void> {
  process.env.AI_ENABLED = "true";
  process.env.MOCK_AI = "true";

  const { prisma } = await import("@/lib/db/client");
  const { repartirDeZero, utilisateurDeTest, UTILISATEUR_DE_TEST } =
    await import("./verification/depot-simule");
  const pipeline = await import("./verification/ingestion-pipeline");
  const reprise = await import("./verification/ingestion-reprise");
  const limites = await import("./verification/ingestion-limites");

  const userId = await utilisateurDeTest();
  await repartirDeZero(userId);

  const capture = await captureDeTest();

  try {
    await pipeline.casDepotTexte(userId);
    await pipeline.casDepotImage(userId, capture);
    await pipeline.casCaptureIllisible(userId, capture);
    await pipeline.casRejet(userId);
    await pipeline.casConceptDouteux(userId);
    await pipeline.casCorrectionDeConcept(userId);

    await reprise.casDecoupageImpossible(userId);
    await reprise.casLectureImpossible(userId, capture);
    await reprise.casLotPerdu(userId);
    await reprise.casEchecPartiel(userId);

    await limites.casDoubleEnvoi(userId);
    await limites.casDebitEtQuota(userId);
    await limites.casListeDattente(userId);

    const octetsRestants = await prisma.input.count({
      where: { userId, imageData: { not: null } },
    });
    record(
      "Aucun octet d'image ne reste en base après le pipeline",
      octetsRestants === 0,
      octetsRestants === 0 ? "aucune image conservée" : `${octetsRestants} dépôt(s) avec image`,
    );

    const appelsEnregistres = await prisma.aiCall.count({ where: { userId } });
    record(
      "Le mode mock n'écrit rien au registre des appels",
      appelsEnregistres === 0,
      `${appelsEnregistres} ligne(s)`,
    );

    record(
      "Aucune requête n'est sortie vers l'API",
      tentativesReseau.length === 0,
      tentativesReseau.length === 0 ? "zéro tentative" : tentativesReseau.join(", "),
    );
  } finally {
    await repartirDeZero(userId);
    await prisma.user.deleteMany({ where: { email: UTILISATEUR_DE_TEST } });
  }
}

main()
  .then(() => conclure("Ingestion vérifiée de bout en bout."))
  .catch((error: unknown) => {
    console.error("La vérification a échoué.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.$disconnect();
  });
