import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * La passe de mesure du corpus.
 *
 * Elle plonge phrases, concepts et questions du dernier figé dans un espace de
 * vecteurs, tire quatre signaux, puis soumet les candidats à trois juges
 * (résidu, fidélité, doublon) qui rendent chacun un verdict binaire. Aucun
 * concept n'est écarté, aucune question supprimée, aucun prompt touché — la
 * mesure ne décide de rien.
 *
 * La passe des vecteurs est hors des garde-fous de `callAI()` : elle ne parle
 * pas au modèle de génération. Les juges, eux, sont des appels Haiku qui
 * passent par `callAI` comme tout le reste, et suivent donc les mêmes règles :
 * `MOCK_AI=false`, `AI_ENABLED=true`, et un gate `--emettre` pour ne rien payer
 * sans le vouloir.
 *
 *   npm run eval:mesures                       # signaux seuls, aucun appel
 *   npm run eval:mesures -- --emettre          # signaux + juges (dépense)
 *   npm run eval:mesures -- --calibrer         # sans plancher : les listes triées
 *   npm run eval:mesures -- --fige <chemin>    # un figé précis
 *   npm run eval:mesures -- --depot 15,23      # restreint à des dépôts
 *
 * Coût des juges : ~30 appels Haiku pour le corpus au 18 août, soit quelques
 * dizaines de centimes. Il tombera à ~130 appels et 0,40 $ le jour où les
 * questions seront gelées.
 *
 * `--calibrer` existe pour le jour où le modèle d'embedding change. Les
 * planchers de `seuils.ts` sont posés dans un espace donné et n'en sortent pas :
 * il faut alors relire les listes et les reposer à la main, comme la première
 * fois. C'est la seule raison de ce mode, et elle n'est pas hypothétique.
 */

const RAPPORTS = join(import.meta.dirname, "evaluation", "rapports");

function refuser(motif: string): never {
  console.error(`La mesure ne démarre pas : ${motif}`);
  process.exit(1);
}

function argument(drapeau: string): string | undefined {
  const rang = process.argv.indexOf(drapeau);
  const valeur = rang === -1 ? undefined : process.argv[rang + 1];

  return valeur?.startsWith("--") ? undefined : valeur;
}

async function main(): Promise<void> {
  const { dernierFige, lireFige } = await import("./evaluation/fige");
  const { plonger } = await import("./evaluation/mesures/embeddings");
  const { mesurerLeDepot, textesDuDepot } = await import("./evaluation/mesures/signaux");
  const { signaler } = await import("./evaluation/mesures/signalements");
  const { rendreLaCalibration } = await import("./evaluation/mesures/rapport-de-calibration");
  const { rendreLesMesures } = await import("./evaluation/mesures/rapport-de-mesures");
  const { compterLesAppelsDesJuges, jugerLesSignalements } = await import(
    "./evaluation/juges/verdicts"
  );

  const chemin = argument("--fige") ?? dernierFige();

  if (chemin === undefined) refuser("aucun figé à mesurer. Lance d'abord un passage du banc.");

  const fige = lireFige(chemin);
  const fragments = (argument("--depot") ?? "").split(",").filter(Boolean);
  const depots = fige.depots.filter(
    (depot) => fragments.length === 0 || fragments.some((f) => depot.nom.includes(f)),
  );

  if (depots.length === 0) {
    refuser(
      fragments.length > 0
        ? `aucun dépôt ne contient « ${fragments.join(" » ni « ")} ».`
        : "le figé ne porte aucun dépôt.",
    );
  }

  const source = `figé ${basename(chemin)} (${fige.modele}, ${fige.emisA.slice(0, 16)} UTC)`;
  const calibrer = process.argv.includes("--calibrer");
  const emettre = process.argv.includes("--emettre");

  console.info(`Mesure : ${source}, ${depots.length} dépôts.`);

  // Un seul appel de plongée pour tout le corpus : les doublons de texte n'y
  // sont plongés qu'une fois, et le cache absorbe ce qui a déjà été calculé.
  const textes = depots.flatMap(textesDuDepot);
  console.info(`${textes.length} textes à plonger, doublons compris.`);

  const passe = await plonger(textes);

  console.info(
    `Vecteurs : ${passe.calcules} calculés, ${passe.enCache} au cache, ${passe.tokens} tokens.`,
  );

  const emisA = new Date();
  const mesures = depots.map((depot) => mesurerLeDepot(depot, passe.vecteur));

  if (calibrer) {
    const rapport = rendreLaCalibration(mesures, {
      emisA,
      source,
      dimension: passe.dimension,
      calcules: passe.calcules,
      enCache: passe.enCache,
      tokens: passe.tokens,
    });
    ecrireRapport(emisA, "calibration", rapport);
    return;
  }

  const signalements = mesures.map(signaler);
  const appels = compterLesAppelsDesJuges(signalements, depots);
  console.info(
    `Juges : ${appels.doublon} appel(s) doublon · ${appels.residu} appel(s) résidu · ${appels.fidelite} appel(s) fidélité — ${appels.doublon + appels.residu + appels.fidelite} au total.`,
  );

  if (appels.doublon + appels.residu + appels.fidelite > 0 && !emettre) {
    console.info("\nRien n'a été émis aux juges. Relance avec --emettre pour dépenser.");
    const rapport = rendreLesMesures(mesures, [], {
      emisA,
      source,
      dimension: passe.dimension,
      calcules: passe.calcules,
      enCache: passe.enCache,
      tokens: passe.tokens,
      coutDesJuges: 0,
    });
    ecrireRapport(emisA, "mesures", rapport);
    return;
  }

  if (appels.doublon + appels.residu + appels.fidelite > 0) {
    exigerLesGardeFous();
  }

  const { sumAiCalls } = await import("@/lib/db/ai-call");
  const debutJuges = new Date();
  const verdicts = await jugerLesSignalements(signalements, depots);
  const consommation = await sumAiCalls(debutJuges);
  console.info(`Juges : ${consommation.calls} appels, ${Number(consommation.costUsd).toFixed(4)} $.`);

  const rapport = rendreLesMesures(mesures, verdicts, {
    emisA,
    source,
    dimension: passe.dimension,
    calcules: passe.calcules,
    enCache: passe.enCache,
    tokens: passe.tokens,
    coutDesJuges: Number(consommation.costUsd),
  });
  ecrireRapport(emisA, "mesures", rapport);
}

function exigerLesGardeFous(): void {
  if (process.env.MOCK_AI !== "false") {
    refuser("les juges dépensent, ils exigent MOCK_AI=false explicitement.");
  }

  if (process.env.AI_ENABLED !== "true") {
    refuser("les appels au modèle sont coupés (AI_ENABLED=false).");
  }
}

function ecrireRapport(emisA: Date, nature: "mesures" | "calibration", rapport: string): void {
  mkdirSync(RAPPORTS, { recursive: true });
  const sortie = join(
    RAPPORTS,
    `${nature}-${emisA.toISOString().slice(0, 16).replace("T", "-").replace(":", "h")}.md`,
  );
  writeFileSync(sortie, rapport, "utf8");
  console.info(`\nRapport écrit dans ${sortie}`);
}

main()
  .catch((erreur: unknown) => {
    console.error("La mesure s'est interrompue.", erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.$disconnect();
  });
