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
 *
 * `--depot <fragment>` restreint le passage aux dépôts dont le nom contient ce
 * fragment. C'est ce qu'on lance quand on vérifie une forme de sortie : deux
 * appels et trois centimes, au lieu de quarante.
 */

const RAPPORTS = join(import.meta.dirname, "evaluation", "rapports");
const MAX_CONCEPTS_PAR_DEPOT = 12;

function refuser(motif: string): never {
  console.error(`Le banc ne démarre pas : ${motif}`);
  process.exit(1);
}

/** La valeur qui suit un drapeau, s'il est là. */
function argument(drapeau: string): string | undefined {
  const rang = process.argv.indexOf(drapeau);

  return rang === -1 ? undefined : process.argv[rang + 1];
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
  const { accorder, rendreRapport, resumeConsole } = await import("./evaluation/rapport");
  const { sumAiCalls } = await import("@/lib/db/ai-call");
  const { lireReservationsDuJour } = await import("@/lib/db/ai-quota");

  const fragment = argument("--depot");
  const corpus = lireCorpus().filter((depot) => !fragment || depot.nom.includes(fragment));

  if (corpus.length === 0) {
    refuser(fragment ? `aucun dépôt ne contient « ${fragment} ».` : "le corpus est vide.");
  }

  const images = corpus.filter((depot) => depot.image).length;
  const plancher = corpus.length + images;
  const plafond = plancher + corpus.length * MAX_CONCEPTS_PAR_DEPOT;
  const reservees = await lireReservationsDuJour();

  console.info(
    `Corpus : ${accorder(corpus.length, "dépôt")}, dont ${accorder(images, "capture")}` +
      `${fragment ? ` — restreint à « ${fragment} »` : ""}.`,
  );
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
  const passages = [];

  // Le coût se relève dépôt par dépôt : un total ne dit pas lequel a coûté dix
  // appels à lui seul.
  for (const depot of corpus) {
    console.info(`… ${depot.nom}`);
    const ouverture = new Date();
    const evaluation = await evaluerDepot(depot);
    passages.push({ evaluation, consommation: await sumAiCalls(ouverture) });
  }

  const total = await sumAiCalls(debut);
  const rapport = rendreRapport(passages, {
    modele: process.env.AI_MODEL ?? "inconnu",
    emisA: debut,
    total,
  });

  mkdirSync(RAPPORTS, { recursive: true });
  const chemin = join(RAPPORTS, nomDuRapport(debut));
  writeFileSync(chemin, rapport, "utf8");

  console.info(`\n${resumeConsole(passages).join("\n")}`);
  console.info(`\n${total.calls} appels, ${Number(total.costUsd).toFixed(4)} $.`);
  console.info(`Rapport écrit dans ${chemin}`);
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
