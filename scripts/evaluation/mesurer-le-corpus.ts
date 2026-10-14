import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { appliquerCapDuBanc } from "./cap-du-banc";

appliquerCapDuBanc();

/**
 * La passe de mesure du corpus : plonge phrases, concepts et questions du
 * dernier figé en vecteurs, en tire les signaux, puis soumet les candidats aux
 * juges, qui rendent chacun un verdict binaire. La mesure ne décide de rien :
 * aucun concept écarté, aucune question supprimée.
 *
 * La plongée est hors des garde-fous de `callAI()` : elle ne parle pas au
 * modèle. Les juges passent par `callAI` et exigent `MOCK_AI=false`,
 * `AI_ENABLED=true` et `--emettre` : sans ce dernier, le nombre d'appels
 * s'affiche et rien n'est payé.
 *
 *   npm run evaluer:mesures                       # signaux seuls, aucun appel
 *   npm run evaluer:mesures -- --emettre          # signaux + juges (dépense)
 *   npm run evaluer:mesures -- --calibrer         # sans plancher : les listes triées
 *   npm run evaluer:mesures -- --fige <chemin>    # un figé précis
 *   npm run evaluer:mesures -- --depot 15,23      # restreint à des dépôts
 *
 * `--calibrer` sert quand le modèle d'embedding change : les planchers de
 * `mesures/seuils.ts` ne valent que dans l'espace où ils ont été posés, et se
 * reposent à la main en relisant les listes triées.
 */

const RAPPORTS = join(import.meta.dirname, "rapports");

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
  const { attendusDuDepot, couvertureDesAttendus, tousLesAttendus } = await import("./attendus");
  const { dernierFige, lireFige } = await import("./fige");
  const { plonger } = await import("./mesures/embeddings");
  const { mesurerLeDepot, textesDuDepot } = await import("./mesures/signaux");
  const { signaler } = await import("./mesures/signalements");
  const { rendreLaCalibration } = await import("./mesures/rapport-de-calibration");
  const { rendreLesMesures } = await import("./mesures/rapport-de-mesures");
  const { compterLesAppelsDesJuges, jugerLesSignalements } = await import("./juges/verdicts");

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

  // Une seule passe de plongée, attendus des témoins compris : chaque texte
  // n'y est plongé qu'une fois, et le cache absorbe les rejeux.
  const textes = [...depots.flatMap(textesDuDepot), ...tousLesAttendus()];
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
  const couvertures = depots
    .filter((depot) => attendusDuDepot(depot.nom).length > 0)
    .map((depot) => ({
      nom: depot.nom,
      couvertures: couvertureDesAttendus(depot.nom, depot.concepts, passe.vecteur),
    }));
  const appels = compterLesAppelsDesJuges(signalements, depots);
  const total = appels.doublon + appels.residu + appels.fidelite + appels.attendus;
  console.info(
    `Appels des juges : ${appels.doublon} doublon · ${appels.residu} résidu · ${appels.fidelite} fidélité · ${appels.attendus} attendus — ${total} au total.`,
  );

  const { chargerCache, compterEnCache } = await import("./juges/cache");
  const dejaEnCache = compterEnCache(chargerCache(chemin));
  const totalEnCache =
    dejaEnCache.doublon + dejaEnCache.residu + dejaEnCache.fidelite + dejaEnCache.attendus;
  if (totalEnCache > 0) {
    console.info(
      `Appels en cache : ${dejaEnCache.doublon} doublon · ${dejaEnCache.residu} résidu · ${dejaEnCache.fidelite} fidélité · ${dejaEnCache.attendus} attendus — ${totalEnCache} déjà rendus, la relance reprend là où c'était.`,
    );
  }

  if (total > 0 && !emettre) {
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

  if (total > 0) exigerLesGardeFous();

  const { sommerLesAppels } = await import("@/lib/db/registre-des-appels");
  const debutJuges = new Date();
  const verdicts = await jugerLesSignalements(signalements, depots, couvertures, chemin);
  const consommation = await sommerLesAppels(debutJuges);
  console.info(
    `Juges : ${consommation.calls} appels, ${Number(consommation.costUsd).toFixed(4)} $.`,
  );

  const rapport = rendreLesMesures(
    mesures,
    verdicts,
    {
      emisA,
      source,
      dimension: passe.dimension,
      calcules: passe.calcules,
      enCache: passe.enCache,
      tokens: passe.tokens,
      coutDesJuges: Number(consommation.costUsd),
    },
    depots,
  );
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
