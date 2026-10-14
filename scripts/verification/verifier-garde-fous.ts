import "dotenv/config";
import { conclure, noterUnEchecAttendu, noter } from "./cases/journal";
import { versUnFournisseurDeModele } from "./cases/hotes-des-fournisseurs";

/**
 * Preuve, à l'exécution, que les garde-fous d'appel modèle tiennent.
 *
 * Le script arme un piège sur `fetch` avant même de charger `lib/ai/client.ts` :
 * toute tentative de sortie réseau vers l'API lève au lieu de partir. Il vérifie
 * ensuite le mode mock, l'interrupteur et le plafond journalier.
 *
 *   npm run verifier:ai
 */

const tentativesReseau: string[] = [];
const vraiFetch = globalThis.fetch;

function fetchPiege(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();
  if (!versUnFournisseurDeModele(url)) return vraiFetch(input, init);

  tentativesReseau.push(url);
  return Promise.reject(new Error(`Requête sortante interdite pendant la vérification : ${url}`));
}

globalThis.fetch = fetchPiege;

async function main(): Promise<void> {
  const { callAI } = await import("@/lib/ai/client");
  const { CONTRAT_D_EXTRACTION, CONTRAT_DE_GENERATION, CONTRAT_DE_LECTURE } =
    await import("@/lib/ai/schemas");

  process.env.AI_ENABLED = "true";
  process.env.MOCK_AI = "true";

  const court = await callAI({
    contract: CONTRAT_D_EXTRACTION,
    system: "",
    messages: [{ role: "user", content: "Une seule phrase, courte." }],
  });
  noter(
    "Mock — une phrase isolée produit un seul Atom",
    court.atoms.length === 1,
    `${court.atoms.length} Atom(s)`,
  );

  const long = await callAI({
    contract: CONTRAT_D_EXTRACTION,
    system: "",
    messages: [{ role: "user", content: "x".repeat(2_000) }],
  });
  noter(
    "Mock — un article produit huit Atoms",
    long.atoms.length === 8,
    `${long.atoms.length} Atom(s)`,
  );

  const courses = await callAI({
    contract: CONTRAT_D_EXTRACTION,
    system: "",
    messages: [{ role: "user", content: "Ma liste de courses : lentilles corail, pain, café." }],
  });
  noter(
    "Mock — une liste de courses ne donne aucun Atom mais un motif",
    courses.atoms.length === 0 && courses.rejected !== null,
    courses.rejected ?? "aucun motif",
  );

  const { lots } = await callAI({
    contract: CONTRAT_DE_GENERATION,
    system: "",
    messages: [{ role: "user", content: "y".repeat(400) }],
  });
  const premier = lots[0]?.variants ?? [];
  const facets = new Set(premier.map((variant) => variant.facet));
  noter(
    "Mock — un lot par concept, quatre facettes distinctes chacun",
    lots.length === 3 && premier.length === 4 && facets.size === 4,
    `${lots.length} lots, ${premier.length} Variants, ${facets.size} facettes`,
  );

  const ocr = await callAI({
    contract: CONTRAT_DE_LECTURE,
    system: "",
    messages: [{ role: "user", content: "Lis cette capture." }],
  });
  noter(
    "Mock — l'OCR rend du texte exploitable et sa langue",
    ocr.usable && ocr.extractedText.length > 0,
    ocr.language ?? "sans langue",
  );

  const floue = await callAI({
    contract: CONTRAT_DE_LECTURE,
    system: "",
    messages: [{ role: "user", content: "capture floue, prise de loin" }],
  });
  noter(
    "Mock — une capture illisible ne rend ni texte ni langue",
    !floue.usable && floue.extractedText === "" && floue.language === null,
    `usable=${floue.usable}, language=${floue.language}`,
  );

  await noterUnEchecAttendu(
    "Une fixture hors schéma est refusée",
    "AI_INVALID_OUTPUT",
    async () => {
      const { chargerLaFixture } = await import("@/lib/ai/fixtures");
      return chargerLaFixture({ ...CONTRAT_DE_LECTURE, purpose: "extract_atoms" }, "", "");
    },
  );

  process.env.AI_ENABLED = "false";
  await noterUnEchecAttendu("AI_ENABLED=false coupe tout appel", "AI_DISABLED", () =>
    callAI({
      contract: CONTRAT_D_EXTRACTION,
      system: "",
      messages: [{ role: "user", content: "test" }],
    }),
  );

  const { verifierPlafond, verifierPartAnonyme } = await import("./cases/garde-fous-plafond");
  await verifierPlafond();
  await verifierPartAnonyme();

  noter(
    "Aucune requête n'est sortie vers l'API",
    tentativesReseau.length === 0,
    tentativesReseau.length === 0 ? "zéro tentative" : tentativesReseau.join(", "),
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
