import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Le banc d'évaluation de la génération.
 *
 * Il prend le corpus de `scripts/evaluation/corpus/`, appelle réellement le
 * modèle, et écrit un rapport lisible : pour chaque dépôt les concepts
 * extraits, et pour chaque concept ses quatre questions avec leur facette.
 *
 * C'est le seul endroit du projet autorisé à dépenser. Il exige donc
 * `MOCK_AI=false` explicitement, annonce ce qu'il va émettre, et ne part qu'à
 * l'appel de `--emettre` :
 *
 *   MOCK_AI=false npx tsx scripts/evaluer-generation.ts             # le plan
 *   MOCK_AI=false npx tsx scripts/evaluer-generation.ts --emettre   # le passage
 */

const RAPPORTS = join(import.meta.dirname, "evaluation", "rapports");
const MAX_CONCEPTS_PAR_DEPOT = 12;

function refuser(motif: string): never {
  console.error(`Le banc ne démarre pas : ${motif}`);
  process.exit(1);
}

function nomDuRapport(instant: Date): string {
  return `${instant.toISOString().slice(0, 16).replace("T", "-").replace(":", "h")}.md`;
}

async function main(): Promise<void> {
  if (process.env.MOCK_AI !== "false") {
    refuser("il consomme de vrais appels, il exige donc MOCK_AI=false explicitement.");
  }

  if (process.env.AI_ENABLED !== "true") {
    refuser("les appels au modèle sont coupés (AI_ENABLED=false).");
  }

  const { lireCorpus } = await import("./evaluation/corpus");
  const { evaluerDepot } = await import("./evaluation/execution");
  const { rendreRapport, resumeConsole } = await import("./evaluation/rapport");
  const { sumAiCallsSince } = await import("@/lib/db/ai-call");
  const { lireReservationsDuJour } = await import("@/lib/db/ai-quota");

  const corpus = lireCorpus();

  if (corpus.length === 0) refuser("le corpus est vide.");

  const images = corpus.filter((depot) => depot.image).length;
  const plancher = corpus.length + images;
  const plafond = plancher + corpus.length * MAX_CONCEPTS_PAR_DEPOT;
  const reservees = await lireReservationsDuJour();

  console.info(`Corpus : ${corpus.length} dépôts, dont ${images} captures.`);
  console.info(`Modèle : ${process.env.AI_MODEL}, ${process.env.AI_MAX_TOKENS} tokens de sortie.`);
  console.info(
    `Appels : ${plancher} d'abord — une lecture par capture, une extraction par dépôt —,` +
      ` puis un par concept extrait, soit ${plafond} au pire.`,
  );
  console.info(`Plafond du jour : ${reservees}/${process.env.AI_DAILY_CALL_CAP} déjà réservés.\n`);

  if (!process.argv.includes("--emettre")) {
    console.info("Rien n'a été émis. Relance avec --emettre pour dépenser.");
    return;
  }

  const debut = new Date();
  const evaluations = [];

  for (const depot of corpus) {
    console.info(`… ${depot.nom}`);
    evaluations.push(await evaluerDepot(depot));
  }

  const { calls, costUsd } = await sumAiCallsSince(debut);
  const rapport = rendreRapport(evaluations, {
    modele: process.env.AI_MODEL ?? "inconnu",
    appels: calls,
    coutUsd: costUsd,
    emisA: debut,
  });

  mkdirSync(RAPPORTS, { recursive: true });
  const chemin = join(RAPPORTS, nomDuRapport(debut));
  writeFileSync(chemin, rapport, "utf8");

  console.info(`\n${resumeConsole(evaluations).join("\n")}`);
  console.info(`\n${calls} appels, ${costUsd} $. Rapport écrit dans ${chemin}`);
}

main()
  .catch((error: unknown) => {
    console.error("Le banc s'est interrompu.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.$disconnect();
  });
