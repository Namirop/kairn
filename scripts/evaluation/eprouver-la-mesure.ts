import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * Chantier clos, sans commande dans `package.json` : voir `docs/outillage.md`,
 * « Les commandes retirées ».
 *
 * L'épreuve de l'instrument par ablation : la couverture réagit-elle à ce
 * qu'elle prétend mesurer ? On retire un concept d'un dépôt figé, on recalcule,
 * et on regarde si les phrases qui s'appuyaient sur lui tombent sous le
 * plancher.
 *
 * Elle prouve que la mesure réagit (chaque retrait déplace la couverture). Elle
 * ne contrôle pas le doublon : un concept redondant chute plus qu'un concept
 * distinct, car redondant entre concepts n'implique pas substituable au niveau
 * de la phrase.
 *
 * Tous les vecteurs viennent du cache : coût zéro.
 *
 *   npx tsx scripts/evaluation/eprouver-la-mesure.ts
 *   npx tsx scripts/evaluation/eprouver-la-mesure.ts -- --depot 22,26
 *   npx tsx scripts/evaluation/eprouver-la-mesure.ts -- --fige <chemin>
 */

const RAPPORTS = join(import.meta.dirname, "rapports");

/**
 * Les témoins : un dépôt sain (`23`), deux redondants (`15`, `16`) et un
 * ordinaire (`09`). Il en faut deux redondants pour voir que la chute ne sépare
 * pas le redondant du distinct.
 */
const TEMOINS = [
  "23-pave-maximal",
  "15-redondance-interne",
  "16-concepts-imbriques",
  "09-fait-pratique",
];

function refuser(motif: string): never {
  console.error(`L'épreuve ne démarre pas : ${motif}`);
  process.exit(1);
}

function argument(drapeau: string): string | undefined {
  const rang = process.argv.indexOf(drapeau);
  const valeur = rang === -1 ? undefined : process.argv[rang + 1];

  return valeur?.startsWith("--") ? undefined : valeur;
}

async function main(): Promise<void> {
  const { dernierFige, lireFige } = await import("./fige");
  const { plonger } = await import("./mesures/embeddings");
  const { eprouverParAblation } = await import("./mesures/ablation");
  const { segmenter } = await import("./mesures/segmentation");
  const { PLANCHER_COUVERTURE } = await import("./mesures/seuils");
  const { rendreLAblation } = await import("./mesures/rapport-d-ablation");

  const chemin = argument("--fige") ?? dernierFige();

  if (chemin === undefined) refuser("aucun figé à éprouver. Lance d'abord un passage du banc.");

  const fige = lireFige(chemin);
  const fragments = (argument("--depot") ?? "").split(",").filter(Boolean);
  const vises = fragments.length > 0 ? fragments : TEMOINS;
  const depots = fige.depots.filter((depot) => vises.some((vise) => depot.nom.includes(vise)));

  if (depots.length === 0) refuser(`aucun dépôt ne contient « ${vises.join(" » ni « ")} ».`);

  console.info(`Épreuve : ${depots.map((depot) => depot.nom).join(", ")}.`);

  const textes = depots.flatMap((depot) => [
    ...segmenter(depot.texte),
    ...depot.concepts.map((concept) => concept.concept),
  ]);
  const passe = await plonger(textes);

  if (passe.calcules > 0) {
    // Attendu à zéro : non nul, le figé a changé depuis sa mesure, et ce qu'on
    // éprouve n'est pas ce qu'on a mesuré.
    console.warn(
      `${passe.calcules} vecteurs ont dû être calculés : ce figé n'avait pas encore été mesuré en entier.`,
    );
  }

  const emisA = new Date();
  const ablations = depots.map((depot) =>
    eprouverParAblation(
      depot.nom,
      segmenter(depot.texte),
      depot.concepts.map((concept) => concept.concept),
      passe.vecteur,
      PLANCHER_COUVERTURE,
    ),
  );

  const rapport = rendreLAblation(ablations, {
    emisA,
    source: `figé ${basename(chemin)}`,
    dimension: passe.dimension,
  });

  mkdirSync(RAPPORTS, { recursive: true });
  const sortie = join(
    RAPPORTS,
    `ablation-${emisA.toISOString().slice(0, 16).replace("T", "-").replace(":", "h")}.md`,
  );
  writeFileSync(sortie, rapport, "utf8");

  for (const ablation of ablations) {
    const avecEffet = ablation.retraits.filter((retrait) => retrait.decouvertes.length > 0).length;
    const chutes = ablation.retraits
      .map((retrait) => retrait.chuteMaximale)
      .filter((chute) => chute !== null)
      .map((chute) => chute.avant - chute.apres)
      .sort((un, deux) => un - deux);
    const mediane = chutes[Math.floor(chutes.length / 2)] ?? 0;

    // La chute d'abord : c'est elle qui dit si la mesure réagit. Les
    // franchissements dépendent d'un plancher posé pour une autre question.
    console.info(
      `${ablation.nom.padEnd(28)} chute médiane ${mediane.toFixed(3)} sur ${chutes.length}/${ablation.retraits.length} retraits · ${avecEffet} franchissent le plancher`,
    );
  }

  console.info(`\nRapport écrit dans ${sortie}`);
}

main().catch((erreur: unknown) => {
  console.error("L'épreuve s'est interrompue.", erreur);
  process.exitCode = 1;
});
