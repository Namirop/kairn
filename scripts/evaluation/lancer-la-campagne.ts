import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { lireCorpus } from "./corpus";
import { dernierFige, lireFige } from "./fige";
import { chargerCache, type CacheDeMesure } from "./juges/cache";
import { BUDGET_SORTIE_CAMPAGNE } from "./openrouter/campagne";
import {
  CHALLENGERS,
  JUGE_PRINCIPAL,
  REFERENCE,
  type ModeleOpenRouter,
} from "./openrouter/modeles";
import { verifierLeListing } from "./openrouter/verification";
import {
  ajouterPlans,
  couterPlan,
  planAttendus,
  planDoublon,
  planExtraction,
  planResidu,
} from "./campagne/plan";
import { passerParColonne, type ScoreDeColonne, type ScoreDepot } from "./campagne/execution";
import {
  rendreLaCorrespondance,
  rendreLeTableauAveugle,
  type Etiquette,
  type ReferenceSonnet,
} from "./campagne/tableau";

/**
 * Campagne 1, close, sans commande : voir `docs/outillage.md`, « Les commandes
 * retirées ». Les challengers jouent l'extraction sur le corpus, le juge note
 * chaque colonne, et le rapport sort aveuglé A/B/C/D.
 *
 * Garde-fous de dépense : sans `--emettre`, plan à sec seulement ; refus si le
 * listing OpenRouter ne confirme pas la fiche (identifiants, prix) ; arrêt sec
 * d'une colonne qui dépasse 2× son estimation (`passerParColonne`). Le cache
 * d'embeddings est partagé avec `evaluer:mesures`.
 *
 * Sorties dans `rapports/campagne/` : `1-<horodatage>.md`, aveuglé, et
 * `1-<horodatage>-correspondance.md`, à ne pas ouvrir avant la lecture du
 * rapport.
 */

const RAPPORTS = join(import.meta.dirname, "rapports", "campagne");

function refuser(motif: string): never {
  console.error(`La campagne ne démarre pas : ${motif}`);
  process.exit(1);
}

function melangerEtiquettes(
  challengers: ModeleOpenRouter[],
): { etiquette: Etiquette; challenger: ModeleOpenRouter }[] {
  const etiquettes: Etiquette[] = ["A", "B", "C", "D"];
  if (challengers.length !== etiquettes.length) {
    throw new Error(
      `Le mélange attend ${etiquettes.length} challengers, il en a reçu ${challengers.length}.`,
    );
  }
  // Tirage non semé : la correspondance est écrite sur disque aussitôt, et c'est
  // elle qui fait foi, pas un rejeu du tirage.
  const ordre = [...challengers];
  for (let i = ordre.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = ordre[i]!;
    ordre[i] = ordre[j]!;
    ordre[j] = tmp;
  }
  return ordre.map((challenger, rang) => ({ etiquette: etiquettes[rang]!, challenger }));
}

function scoreDepotDepuisFige(
  nom: string,
  fige: ReturnType<typeof lireFige>,
  cache: CacheDeMesure,
): ScoreDepot {
  const depot = fige.depots.find((d) => d.nom === nom);
  const v = cache.depots[nom];
  if (!depot) throw new Error(`Dépôt ${nom} absent du figé.`);
  const attendusEntrees = v?.attendus ?? [];
  return {
    nom,
    nbConcepts: depot.concepts.length,
    rejet: depot.rejet,
    echec: depot.echec?.motif ?? null,
    doublonsSignales: v?.doublons?.length ?? 0,
    doublonsConfirmes: v?.doublons?.filter((p) => p.independants === false).length ?? 0,
    manquesSignales: v?.residu?.manques.length ?? 0,
    manquesConfirmes: v?.residu?.manques.filter((m) => m.retenir === true).length ?? 0,
    inventionsSignalees: v?.residu?.inventions.length ?? 0,
    inventionsConfirmees: v?.residu?.inventions.filter((i) => i.soutenu === false).length ?? 0,
    attendusCouverts: attendusEntrees.filter((a) => a.verdict?.couvert === true).length,
    attendusTotal: attendusEntrees.length,
  };
}

function challengersSelectionnes(): ModeleOpenRouter[] {
  const arg = process.argv.find((a) => a.startsWith("--modele="));
  if (!arg) return CHALLENGERS;
  const id = arg.slice("--modele=".length).trim();
  const trouve = CHALLENGERS.find((m) => m.id === id);
  if (!trouve) {
    throw new Error(
      `Identifiant inconnu : « ${id} ». Attendu l'un de : ${CHALLENGERS.map((m) => m.id).join(", ")}.`,
    );
  }
  return [trouve];
}

async function main(): Promise<void> {
  const emettre = process.argv.includes("--emettre");
  const challengers = challengersSelectionnes();
  const rejeu = challengers.length !== CHALLENGERS.length;
  console.info(
    `# Campagne 1 — ${emettre ? "émission" : "plan à sec (ajoute --emettre pour dépenser)"}${rejeu ? ` (rejeu ${challengers[0]?.nom})` : ""}\n`,
  );

  // 1. Vérifications préalables
  const refus = await verifierLeListing([REFERENCE, ...challengers, JUGE_PRINCIPAL]);
  if (refus.length > 0) {
    console.error("Listing OpenRouter refuse la campagne :");
    for (const r of refus) console.error(`  - ${r.modele.nom} (${r.modele.id}) : ${r.motif}`);
    refuser("le catalogue a bougé, la fiche doit être mise à jour avant d'émettre.");
  }

  // 2. Charger le corpus et la référence
  const cheminFige = dernierFige();
  if (!cheminFige) refuser("aucun figé disponible — la référence Sonnet est requise.");
  const fige = lireFige(cheminFige);
  const cache = chargerCache(cheminFige);
  const corpus = lireCorpus();
  const textesDuFige = new Map(fige.depots.map((d) => [d.nom, d.texte]));
  console.info(`Corpus : ${corpus.length} dépôts. Référence : ${basename(cheminFige)}.\n`);

  // 3. Estimation par colonne — le cache Sonnet sert de proxy de volume
  const extraction = planExtraction(corpus, fige);
  const doublon = planDoublon(fige, cache);
  const residu = planResidu(fige, cache);
  const attendusPlan = planAttendus(cache);
  const juges = ajouterPlans(ajouterPlans(doublon, residu), attendusPlan);

  console.info(`## Estimation par challenger (plan à sec)\n`);
  const estimations = new Map<string, { extraction: number; juges: number }>();
  for (const c of challengers) {
    const coutE = couterPlan(extraction, c);
    const coutJ = couterPlan(juges, JUGE_PRINCIPAL);
    estimations.set(c.id, { extraction: coutE, juges: coutJ });
    console.info(
      `  ${c.nom.padEnd(22)} — extraction ~${coutE.toFixed(4)} $, juges ~${coutJ.toFixed(4)} $, total ~${(coutE + coutJ).toFixed(4)} $ (garde-fou 2× : ${(2 * (coutE + coutJ)).toFixed(4)} $)`,
    );
  }
  const totalEstime = [...estimations.values()].reduce((s, e) => s + e.extraction + e.juges, 0);
  console.info(
    `\n**Total campagne estimé** : ~${totalEstime.toFixed(4)} $. Budget de sortie par appel : ${BUDGET_SORTIE_CAMPAGNE} tokens.\n`,
  );

  if (!emettre) {
    console.info(`Rien n'a été émis. Relance avec --emettre pour dépenser.`);
    return;
  }

  // 4. Étiqueter A/B/C/D et écrire la correspondance TOUT DE SUITE
  const emisA = new Date();
  const etiquetees = rejeu
    ? challengers.map((challenger, rang) => ({
        etiquette: (["A", "B", "C", "D"] as const)[rang] ?? "A",
        challenger,
      }))
    : melangerEtiquettes(challengers);
  const horodatage = emisA.toISOString().slice(0, 16).replace("T", "-").replace(":", "h");
  mkdirSync(RAPPORTS, { recursive: true });
  const cheminCorrespondance = join(RAPPORTS, `1-${horodatage}-correspondance.md`);
  // Écrite avant la passe pour survivre à un crash ; réécrite avec les scores.
  const correspondanceProvisoire = etiquetees.map(({ etiquette, challenger }) => ({
    etiquette,
    score: {
      challenger,
      depots: [],
      factureExtraction: { in: 0, out: 0, usd: 0, appels: 0 },
      factureJuges: { in: 0, out: 0, usd: 0, appels: 0 },
      statut: { code: "complete" as const },
    },
  }));
  writeFileSync(
    cheminCorrespondance,
    rendreLaCorrespondance(correspondanceProvisoire, emisA),
    "utf8",
  );
  console.info(
    `\nCorrespondance écrite (à ne pas ouvrir avant l'arrêt 2) : ${cheminCorrespondance}\n`,
  );

  // 5. Émettre colonne par colonne
  const scores: { etiquette: Etiquette; score: ScoreDeColonne }[] = [];
  for (const { etiquette, challenger } of etiquetees) {
    console.info(`## Colonne ${etiquette}`);
    console.info(`  challenger : ${challenger.nom} (${challenger.id})`);
    const estim = estimations.get(challenger.id);
    if (!estim) throw new Error(`Estimation introuvable pour ${challenger.id}.`);
    const score = await passerParColonne(
      challenger,
      corpus,
      textesDuFige,
      estim.extraction,
      estim.juges,
      (m) => console.info(m),
    );
    scores.push({ etiquette, score });
    console.info(
      `  ⟶ colonne ${etiquette} finie — extraction ${score.factureExtraction.usd.toFixed(4)} $, juges ${score.factureJuges.usd.toFixed(4)} $, statut ${score.statut.code}\n`,
    );
  }

  // 6. Construire la référence Sonnet
  const reference: ReferenceSonnet = {
    depots: fige.depots.map((d) => scoreDepotDepuisFige(d.nom, fige, cache)),
  };

  // 7. Rapport aveuglé + correspondance finale
  const rapport = rendreLeTableauAveugle(reference, scores, emisA);
  const cheminRapport = join(RAPPORTS, `1-${horodatage}.md`);
  writeFileSync(cheminRapport, rapport, "utf8");
  writeFileSync(cheminCorrespondance, rendreLaCorrespondance(scores, emisA), "utf8");

  const totalReel = scores.reduce(
    (s, { score }) => s + score.factureExtraction.usd + score.factureJuges.usd,
    0,
  );
  console.info(`Rapport aveuglé : ${cheminRapport}`);
  console.info(`Correspondance   : ${cheminCorrespondance}`);
  console.info(
    `\n**Facture réelle** : ${totalReel.toFixed(4)} $ (estimation ~${totalEstime.toFixed(4)} $).`,
  );
}

main().catch((erreur: unknown) => {
  console.error("La campagne s'est interrompue.", erreur);
  process.exitCode = 1;
});
