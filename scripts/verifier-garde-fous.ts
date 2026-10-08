import "dotenv/config";
import { conclure, expectFailure, record } from "./verification/journal";
import { versUnFournisseurDeModele } from "./verification/hotes-des-fournisseurs";

/**
 * Preuve, à l'exécution, que les garde-fous d'appel modèle tiennent.
 *
 * Le script arme un piège sur `fetch` avant même de charger `lib/ai/client.ts` :
 * toute tentative de sortie réseau vers l'API lève au lieu de partir. Il vérifie
 * ensuite le mode mock, l'interrupteur et le plafond journalier.
 *
 *   npm run verifier:ai
 */

const networkAttempts: string[] = [];
const realFetch = globalThis.fetch;

function trippedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();
  if (!versUnFournisseurDeModele(url)) return realFetch(input, init);

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

  const { lots } = await callAI({
    contract: GENERATE_VARIANTS,
    system: "",
    messages: [{ role: "user", content: "y".repeat(400) }],
  });
  const premier = lots[0]?.variants ?? [];
  const facets = new Set(premier.map((variant) => variant.facet));
  record(
    "Mock — un lot par concept, quatre facettes distinctes chacun",
    lots.length === 3 && premier.length === 4 && facets.size === 4,
    `${lots.length} lots, ${premier.length} Variants, ${facets.size} facettes`,
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
    return loadFixture({ ...OCR_EXTRACT, purpose: "extract_atoms" }, "", "");
  });

  process.env.AI_ENABLED = "false";
  await expectFailure("AI_ENABLED=false coupe tout appel", "AI_DISABLED", () =>
    callAI({
      contract: EXTRACT_ATOMS,
      system: "",
      messages: [{ role: "user", content: "test" }],
    }),
  );

  const { verifierPlafond, verifierPartAnonyme } =
    await import("./verification/garde-fous-plafond");
  await verifierPlafond();
  await verifierPartAnonyme();

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
