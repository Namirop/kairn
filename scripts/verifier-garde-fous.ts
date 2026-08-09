import "dotenv/config";

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

  if (url.includes("anthropic.com")) {
    networkAttempts.push(url);
    return Promise.reject(new Error(`Requête sortante interdite pendant la vérification : ${url}`));
  }

  return realFetch(input, init);
}

globalThis.fetch = trippedFetch;

const checks: { label: string; ok: boolean; detail: string }[] = [];

function record(label: string, ok: boolean, detail: string): void {
  checks.push({ label, ok, detail });
}

async function expectFailure(
  label: string,
  expectedCode: string,
  run: () => Promise<unknown>,
): Promise<void> {
  try {
    await run();
    record(label, false, "aucune erreur levée");
  } catch (error) {
    const code =
      error !== null && typeof error === "object" && "code" in error
        ? String(error.code)
        : "inconnu";
    record(label, code === expectedCode, `code levé : ${code}`);
  }
}

async function main(): Promise<void> {
  const { callAI } = await import("@/lib/ai/client");
  const { extractAtomsSchema, generateVariantsSchema, ocrExtractSchema } =
    await import("@/lib/ai/schemas");

  process.env.AI_ENABLED = "true";
  process.env.MOCK_AI = "true";

  const short = await callAI({
    purpose: "extract_atoms",
    schema: extractAtomsSchema,
    system: "",
    messages: [{ role: "user", content: "Une seule phrase, courte." }],
  });
  record(
    "Mock — une phrase isolée produit un seul Atom",
    short.atoms.length === 1,
    `${short.atoms.length} Atom(s)`,
  );

  const long = await callAI({
    purpose: "extract_atoms",
    schema: extractAtomsSchema,
    system: "",
    messages: [{ role: "user", content: "x".repeat(1_200) }],
  });
  record(
    "Mock — un pavé produit six Atoms",
    long.atoms.length === 6,
    `${long.atoms.length} Atom(s)`,
  );

  const variants = await callAI({
    purpose: "generate_variants",
    schema: generateVariantsSchema,
    system: "",
    messages: [{ role: "user", content: "y".repeat(400) }],
  });
  const formats = new Set(variants.variants.map((variant) => variant.format));
  record(
    "Mock — les Variants ont des formats différents",
    variants.variants.length >= 3 && formats.size === variants.variants.length,
    `${variants.variants.length} Variants, ${formats.size} formats`,
  );

  const ocr = await callAI({
    purpose: "ocr_extract",
    schema: ocrExtractSchema,
    system: "",
    messages: [{ role: "user", content: "Lis cette capture." }],
  });
  record(
    "Mock — l'OCR rend du texte et un niveau de confiance",
    ocr.text.length > 0,
    ocr.confidence,
  );

  await expectFailure("Une fixture hors schéma est refusée", "AI_INVALID_OUTPUT", async () => {
    const { loadFixture } = await import("@/lib/ai/fixtures");
    return loadFixture("extract_atoms", ocrExtractSchema, 0);
  });

  process.env.AI_ENABLED = "false";
  await expectFailure("AI_ENABLED=false coupe tout appel", "AI_DISABLED", () =>
    callAI({
      purpose: "extract_atoms",
      schema: extractAtomsSchema,
      system: "",
      messages: [{ role: "user", content: "test" }],
    }),
  );

  // Le plafond se lit dans `AiCall`. On écrit une ligne datée d'aujourd'hui,
  // on abaisse le plafond à un, puis on nettoie.
  const { prisma } = await import("@/lib/db/client");
  const { recordAiCall } = await import("@/lib/db/ai-call");
  const marker = "verification_garde_fous";

  await recordAiCall({
    purpose: marker,
    model: "verification",
    inputTokens: 0,
    outputTokens: 0,
    costUsd: "0",
    latencyMs: 0,
    success: true,
  });

  process.env.AI_ENABLED = "true";
  process.env.MOCK_AI = "false";
  process.env.AI_DAILY_CALL_CAP = "1";
  await expectFailure("Le plafond journalier refuse avant d'émettre", "AI_QUOTA", () =>
    callAI({
      purpose: "extract_atoms",
      schema: extractAtomsSchema,
      system: "",
      messages: [{ role: "user", content: "test" }],
    }),
  );

  await prisma.aiCall.deleteMany({ where: { purpose: marker } });

  record(
    "Aucune requête n'est sortie vers l'API",
    networkAttempts.length === 0,
    networkAttempts.length === 0 ? "zéro tentative" : networkAttempts.join(", "),
  );
}

main()
  .then(async () => {
    for (const check of checks) {
      console.info(`${check.ok ? "ok  " : "ÉCHEC"}  ${check.label} — ${check.detail}`);
    }
    const failed = checks.filter((check) => !check.ok).length;
    console.info(failed === 0 ? "\nGarde-fous vérifiés." : `\n${failed} vérification(s) en échec.`);
    process.exitCode = failed === 0 ? 0 : 1;
  })
  .catch((error: unknown) => {
    console.error("La vérification a échoué.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.$disconnect();
  });
