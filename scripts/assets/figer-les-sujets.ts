import "dotenv/config";
import { appliquerCapDuBanc } from "@/scripts/evaluation/cap-du-banc";

appliquerCapDuBanc();

/**
 * Fige les vraies sorties du pipeline pour les sujets de démonstration.
 *
 * Il réutilise `evaluerDepot` du banc — même extraction, même génération, par le
 * seul point d'entrée `callAI` — et n'écrit rien dans les tables de
 * l'application. Le résultat va dans un figé d'assets versionné : une fois posé,
 * le seed et les captures ne repayent jamais.
 *
 * C'est le seul script d'assets qui dépense. Il exige `MOCK_AI=false` et
 * `AI_ENABLED=true`, plafonne les appels par `BANC_DAILY_CALL_CAP`, annonce ce
 * qu'il va faire, et ne part qu'à `--emettre` :
 *
 *   BANC_DAILY_CALL_CAP=60 MOCK_AI=false npm run assets:figer               # le plan
 *   BANC_DAILY_CALL_CAP=60 MOCK_AI=false npm run assets:figer -- --emettre  # la dépense
 *
 * `--refaire` réextrait tous les sujets même déjà figés.
 */

function refuser(motif: string): never {
  console.error(`Le figé ne démarre pas : ${motif}`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (process.env.MOCK_AI !== "false") {
    refuser("il consomme de vrais appels ; il exige MOCK_AI=false explicitement.");
  }

  if (process.env.AI_ENABLED !== "true") {
    refuser("les appels au modèle sont coupés (AI_ENABLED=false).");
  }

  const { SUJETS, ordreDuSujet } = await import("@/scripts/assets/sujets");
  const { evaluerDepot } = await import("@/scripts/evaluation/execution");
  const { lireFigeDAssets, ecrireFigeDAssets, depuisDepotEvalue, couvertureDesFormats } =
    await import("@/scripts/assets/fige");
  const { sumAiCalls } = await import("@/lib/db/ai-call");
  const { lireReservationsDuJour } = await import("@/lib/db/ai-quota");

  const refaire = process.argv.includes("--refaire");
  const existants = refaire ? [] : lireFigeDAssets();
  const dejaFige = new Set(existants.map((depot) => depot.cle));
  const aFaire = SUJETS.filter((sujet) => refaire || !dejaFige.has(sujet.cle));

  console.info(
    `Sujets : ${SUJETS.length} au total, ${aFaire.length} à extraire` +
      (existants.length > 0 ? `, ${existants.length} réutilisés du figé.` : "."),
  );
  console.info(`Modèle : ${process.env.AI_MODEL}, ${process.env.AI_MAX_TOKENS} tokens de sortie.`);
  console.info(
    `Plafond du jour : ${await lireReservationsDuJour()}/${process.env.AI_DAILY_CALL_CAP} déjà réservés.`,
  );

  if (aFaire.length === 0) {
    console.info("\nRien à extraire : le figé couvre déjà tous les sujets.");
    return;
  }

  if (!process.argv.includes("--emettre")) {
    console.info(`\nÀ extraire : ${aFaire.map((sujet) => sujet.cle).join(", ")}.`);
    console.info("Rien n'a été émis. Relance avec --emettre pour dépenser.");
    return;
  }

  const debut = new Date();
  const parCle = new Map(existants.map((depot) => [depot.cle, depot]));

  for (const sujet of aFaire) {
    console.info(`… ${sujet.cle}`);
    const evalue = await evaluerDepot(sujet.depot);
    parCle.set(
      sujet.cle,
      depuisDepotEvalue(evalue, {
        cle: sujet.cle,
        titre: sujet.titre,
        estImage: sujet.depot.image !== undefined,
      }),
    );
  }

  const depots = [...parCle.values()].sort((a, b) => ordreDuSujet(a.cle) - ordreDuSujet(b.cle));
  const chemin = ecrireFigeDAssets(depots, process.env.AI_MODEL ?? "inconnu");
  const total = await sumAiCalls(debut);

  console.info(`\n${total.calls} appels, ${Number(total.costUsd).toFixed(4)} $.`);
  console.info(`Figé écrit dans ${chemin}`);

  const couverture = couvertureDesFormats(depots);
  console.info(`Couverture des formats : ${JSON.stringify(couverture)}`);

  const manquants = ["MCQ", "TRUE_FALSE", "CLOZE"].filter((format) => !couverture[format]);
  if (manquants.length > 0) {
    console.warn(
      `⚠ Formats absents du figé : ${manquants.join(", ")}. Cure les textes ou relance --refaire.`,
    );
  }
}

main()
  .catch((erreur: unknown) => {
    console.error("Le figé s'est interrompu.", erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.$disconnect();
  });
