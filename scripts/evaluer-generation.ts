import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * Le banc d'évaluation de la génération.
 *
 * Deux passages distincts. Le passage complet prend le corpus de
 * `scripts/evaluation/corpus/`, extrait les concepts, écrit quatre questions
 * par concept, et fige les concepts extraits pour plus tard. Le rejeu repart
 * d'un figé : mêmes concepts, seule la génération de questions bouge — c'est
 * le seul moyen de mesurer une modification sans que l'extraction bouge sous
 * la mesure.
 *
 * C'est le seul endroit du projet autorisé à dépenser. Il exige donc
 * `MOCK_AI=false` explicitement, annonce ce qu'il va émettre, et ne part qu'à
 * l'appel de `--emettre` :
 *
 *   MOCK_AI=false npm run eval:generation                  # le plan
 *   MOCK_AI=false npm run eval:generation -- --emettre     # le passage complet
 *   MOCK_AI=false npm run eval:rejeu -- --emettre          # le rejeu du dernier figé
 *
 * `--depot <fragment>` restreint aux dépôts dont le nom contient ce fragment ;
 * `--rejeu <chemin>` désigne un figé précis.
 */

const RAPPORTS = join(import.meta.dirname, "evaluation", "rapports");
const MAX_CONCEPTS_PAR_DEPOT = 12;

function refuser(motif: string): never {
  console.error(`Le banc ne démarre pas : ${motif}`);
  process.exit(1);
}

/** La valeur qui suit un drapeau, si elle n'est pas elle-même un drapeau. */
function argument(drapeau: string): string | undefined {
  const rang = process.argv.indexOf(drapeau);
  const valeur = rang === -1 ? undefined : process.argv[rang + 1];

  return valeur?.startsWith("--") ? undefined : valeur;
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
  const { evaluerDepot, rejouerDepot } = await import("./evaluation/execution");
  const { dernierFige, ecrireFige, lireFige } = await import("./evaluation/fige");
  const { accorder, rendreRapport, resumeConsole } = await import("./evaluation/rapport");
  const { sumAiCalls } = await import("@/lib/db/ai-call");
  const { lireReservationsDuJour } = await import("@/lib/db/ai-quota");

  const fragment = argument("--depot");
  const rejeu = process.argv.includes("--rejeu");
  const figeDemande = rejeu ? (argument("--rejeu") ?? dernierFige()) : undefined;

  if (rejeu && figeDemande === undefined) {
    refuser("aucun figé à rejouer. Lance d'abord un passage complet.");
  }

  const garder = <T extends { nom: string }>(entrees: T[]) =>
    entrees.filter((entree) => !fragment || entree.nom.includes(fragment));

  const corpus = garder(lireCorpus());
  const fige = figeDemande === undefined ? undefined : lireFige(figeDemande);
  const figes = garder(fige?.depots ?? []);
  const aTraiter = rejeu ? figes.length : corpus.length;

  if (aTraiter === 0) {
    refuser(fragment ? `aucun dépôt ne contient « ${fragment} ».` : "il n'y a rien à traiter.");
  }

  const { CONCEPTS_PAR_APPEL } = await import("@/lib/ai/schemas");
  const appelsPour = (concepts: number) => Math.ceil(concepts / CONCEPTS_PAR_APPEL);

  // Un concept douteux ne part pas en génération : il ne compte pas au plan.
  const aGenerer = figes.map(
    (depot) => depot.concepts.filter((concept) => !concept.uncertain).length,
  );
  const generations = aGenerer.reduce((total, concepts) => total + appelsPour(concepts), 0);
  const images = corpus.filter((depot) => depot.image).length;
  const plancher = rejeu ? generations : corpus.length + images;
  const plafond = rejeu
    ? generations
    : plancher + corpus.length * appelsPour(MAX_CONCEPTS_PAR_DEPOT);
  const source = rejeu
    ? `rejeu du figé ${basename(figeDemande ?? "")} (${fige?.modele}, ${fige?.emisA.slice(0, 16)} UTC)`
    : "extraction du corpus";

  console.info(`Passage : ${source}${fragment ? `, restreint à « ${fragment} »` : ""}.`);
  console.info(`Modèle : ${process.env.AI_MODEL}, ${process.env.AI_MAX_TOKENS} tokens de sortie.`);
  const aRegenerer = aGenerer.reduce((total, concepts) => total + concepts, 0);

  console.info(
    rejeu
      ? `Appels : ${accorder(aRegenerer, "concept figé", "concepts figés")} à regénérer,` +
          ` ${CONCEPTS_PAR_APPEL} par appel, soit ${accorder(generations, "appel")}.`
      : `Appels : ${plancher} d'abord — une lecture par capture, une extraction par dépôt —, puis` +
          ` un par groupe de ${CONCEPTS_PAR_APPEL} concepts, soit ${plafond} au pire.`,
  );
  console.info(
    `Plafond du jour : ${await lireReservationsDuJour()}/${process.env.AI_DAILY_CALL_CAP} déjà réservés.\n`,
  );

  if (!process.argv.includes("--emettre")) {
    console.info("Rien n'a été émis. Relance avec --emettre pour dépenser.");
    return;
  }

  const debut = new Date();
  const passages = [];

  // Le coût se relève dépôt par dépôt : un total ne dit pas lequel a coûté dix
  // appels à lui seul.
  for (const entree of rejeu ? figes : corpus) {
    console.info(`… ${entree.nom}`);
    const ouverture = new Date();
    const evaluation =
      "concepts" in entree ? await rejouerDepot(entree) : await evaluerDepot(entree);
    passages.push({ evaluation, consommation: await sumAiCalls(ouverture) });
  }

  const modele = process.env.AI_MODEL ?? "inconnu";
  const total = await sumAiCalls(debut);
  const rapport = rendreRapport(passages, { modele, emisA: debut, total, source });

  mkdirSync(RAPPORTS, { recursive: true });
  const chemin = join(RAPPORTS, nomDuRapport(debut));
  writeFileSync(chemin, rapport, "utf8");

  console.info(`\n${resumeConsole(passages).join("\n")}`);
  console.info(`\n${total.calls} appels, ${Number(total.costUsd).toFixed(4)} $.`);
  console.info(`Rapport écrit dans ${chemin}`);

  if (!rejeu) {
    const fige = ecrireFige(
      passages.map((passage) => passage.evaluation),
      modele,
      debut,
    );
    console.info(`Concepts figés dans ${fige}`);
  }
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
