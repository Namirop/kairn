import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * La passe de mesure du corpus.
 *
 * Elle ne parle **jamais** au modèle de génération : elle repart d'un figé, en
 * plonge les phrases, les concepts et les questions dans un espace de vecteurs,
 * et en tire quatre signaux. Aucun concept n'est écarté, aucune question
 * supprimée, aucun prompt touché — la mesure ne décide de rien. Elle est donc
 * hors des garde-fous de `callAI()` : ni `MOCK_AI`, ni `AI_ENABLED`, ni le
 * plafond journalier ne la concernent, et elle n'écrit rien dans `AiCall`.
 *
 * Le coût tient dans une fraction de centime, et tombe à zéro au second
 * passage : les vecteurs sont déterministes et restent en cache.
 *
 *   npm run eval:mesures                     # le dernier figé, planchers appliqués
 *   npm run eval:mesures -- --calibrer       # sans plancher : les listes triées
 *   npm run eval:mesures -- --fige <chemin>  # un figé précis
 *   npm run eval:mesures -- --depot 15,23    # restreint à des dépôts
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
  const { rendreLaCalibration } = await import("./evaluation/mesures/rapport-de-calibration");
  const { rendreLesMesures } = await import("./evaluation/mesures/rapport-de-mesures");

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
  const calibrer = process.argv.includes("--calibrer");
  const mesures = depots.map((depot) => mesurerLeDepot(depot, passe.vecteur));
  const entete = {
    emisA,
    source,
    dimension: passe.dimension,
    calcules: passe.calcules,
    enCache: passe.enCache,
    tokens: passe.tokens,
  };
  const rapport = calibrer
    ? rendreLaCalibration(mesures, entete)
    : rendreLesMesures(mesures, entete);

  mkdirSync(RAPPORTS, { recursive: true });
  const sortie = join(
    RAPPORTS,
    `${calibrer ? "calibration" : "mesures"}-${emisA.toISOString().slice(0, 16).replace("T", "-").replace(":", "h")}.md`,
  );
  writeFileSync(sortie, rapport, "utf8");

  console.info(`\nRapport écrit dans ${sortie}`);
}

main().catch((erreur: unknown) => {
  console.error("La mesure s'est interrompue.", erreur);
  process.exitCode = 1;
});
