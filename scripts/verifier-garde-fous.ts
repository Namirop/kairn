import "dotenv/config";
import { conclure, expectFailure, record } from "./verification/journal";

/**
 * Preuve, à l'exécution, que les garde-fous d'appel modèle tiennent.
 *
 * Le script arme un piège sur `fetch` avant même de charger `lib/ai/client.ts` :
 * toute tentative de sortie réseau vers l'API lève au lieu de partir. Il vérifie
 * ensuite le mode mock, l'interrupteur et le plafond journalier.
 *
 *   npm run verify:ai
 */

const networkAttempts: string[] = [];
const realFetch = globalThis.fetch;

function trippedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();
  if (!url.includes("anthropic.com")) return realFetch(input, init);

  networkAttempts.push(url);
  return Promise.reject(new Error(`Requête sortante interdite pendant la vérification : ${url}`));
}

globalThis.fetch = trippedFetch;

async function main(): Promise<void> {
  const { callAI } = await import("@/lib/ai/client");
  const { EXTRACT_ATOMS, GENERATE_VARIANTS, OCR_EXTRACT } = await import("@/lib/ai/schemas");

  process.env.AI_ENABLED = "true";
  process.env.MOCK_AI = "true";

  const short = await callAI({
    contract: EXTRACT_ATOMS,
    system: "",
    messages: [{ role: "user", content: "Une seule phrase, courte." }],
  });
  record(
    "Mock — une phrase isolée produit un seul Atom",
    short.atoms.length === 1,
    `${short.atoms.length} Atom(s)`,
  );

  const long = await callAI({
    contract: EXTRACT_ATOMS,
    system: "",
    messages: [{ role: "user", content: "x".repeat(2_000) }],
  });
  record(
    "Mock — un article produit huit Atoms",
    long.atoms.length === 8,
    `${long.atoms.length} Atom(s)`,
  );

  const courses = await callAI({
    contract: EXTRACT_ATOMS,
    system: "",
    messages: [{ role: "user", content: "Ma liste de courses : lentilles corail, pain, café." }],
  });
  record(
    "Mock — une liste de courses ne donne aucun Atom mais un motif",
    courses.atoms.length === 0 && courses.rejected !== null,
    courses.rejected ?? "aucun motif",
  );

  const variants = await callAI({
    contract: GENERATE_VARIANTS,
    system: "",
    messages: [{ role: "user", content: "y".repeat(400) }],
  });
  const facets = new Set(variants.variants.map((variant) => variant.facet));
  record(
    "Mock — quatre Variants sur quatre facettes distinctes",
    variants.variants.length === 4 && facets.size === 4,
    `${variants.variants.length} Variants, ${facets.size} facettes`,
  );

  const ocr = await callAI({
    contract: OCR_EXTRACT,
    system: "",
    messages: [{ role: "user", content: "Lis cette capture." }],
  });
  record(
    "Mock — l'OCR rend du texte exploitable et sa langue",
    ocr.usable && ocr.extractedText.length > 0,
    ocr.language ?? "sans langue",
  );

  const floue = await callAI({
    contract: OCR_EXTRACT,
    system: "",
    messages: [{ role: "user", content: "capture floue, prise de loin" }],
  });
  record(
    "Mock — une capture illisible ne rend ni texte ni langue",
    !floue.usable && floue.extractedText === "" && floue.language === null,
    `usable=${floue.usable}, language=${floue.language}`,
  );

  await expectFailure("Une fixture hors schéma est refusée", "AI_INVALID_OUTPUT", async () => {
    const { loadFixture } = await import("@/lib/ai/fixtures");
    return loadFixture({ ...OCR_EXTRACT, purpose: "extract_atoms" }, "");
  });

  process.env.AI_ENABLED = "false";
  await expectFailure("AI_ENABLED=false coupe tout appel", "AI_DISABLED", () =>
    callAI({
      contract: EXTRACT_ATOMS,
      system: "",
      messages: [{ role: "user", content: "test" }],
    }),
  );

  // Le plafond du jour est amené à saturation, puis remis exactement dans
  // l'état où il était : la vérification ne doit consommer aucune vraie place.
  // La tenue sous concurrence est prouvée séparément, sur un jour sentinelle,
  // par scripts/verifier-plafond-concurrent.ts.
  const { prisma } = await import("@/lib/db/client");
  const { lireReservationsDuJour } = await import("@/lib/db/ai-quota");
  const { dayToUtcDate, localDay } = await import("@/lib/domain/local-day");

  const jour = dayToUtcDate(localDay(new Date(), "UTC"));
  const avant = await prisma.aiCallQuota.findUnique({ where: { day: jour } });
  const sature = 3;

  await prisma.aiCallQuota.upsert({
    where: { day: jour },
    create: { day: jour, reserved: sature },
    update: { reserved: sature },
  });

  process.env.AI_ENABLED = "true";
  process.env.MOCK_AI = "false";
  process.env.AI_DAILY_CALL_CAP = String(sature);
  await expectFailure("Le plafond journalier refuse avant d'émettre", "AI_QUOTA", () =>
    callAI({
      contract: EXTRACT_ATOMS,
      system: "",
      messages: [{ role: "user", content: "test" }],
    }),
  );

  record(
    "Un refus n'entame pas le compteur",
    (await lireReservationsDuJour()) === sature,
    `compteur à ${await lireReservationsDuJour()}`,
  );

  if (avant) {
    await prisma.aiCallQuota.update({ where: { day: jour }, data: { reserved: avant.reserved } });
  } else {
    await prisma.aiCallQuota.delete({ where: { day: jour } });
  }

  record(
    "Aucune requête n'est sortie vers l'API",
    networkAttempts.length === 0,
    networkAttempts.length === 0 ? "zéro tentative" : networkAttempts.join(", "),
  );
}

main()
  .then(() => conclure("Garde-fous vérifiés."))
  .catch((error: unknown) => {
    console.error("La vérification a échoué.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.$disconnect();
  });
