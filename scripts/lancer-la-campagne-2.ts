import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { conceptsAQuestionner } from "@/lib/domain/nature-du-depot";
import { dernierFige, lireFige } from "./evaluation/fige";
import { chargerCache } from "./evaluation/juges/cache";
import { plonger } from "./evaluation/mesures/embeddings";
import { estimerColonne } from "./evaluation/campagne/plan-questions";
import {
  passerParColonneQuestions,
  scoreReferenceSonnet,
  type ScoreDeColonneQuestions,
} from "./evaluation/campagne/execution-questions";
import {
  rendreLaCorrespondanceQuestions,
  rendreLeTableauAveugleQuestions,
  type Etiquette,
  type ReferenceSonnetQuestions,
} from "./evaluation/campagne/tableau-questions";
import { BUDGET_SORTIE_CAMPAGNE } from "./evaluation/openrouter/campagne";
import {
  CHALLENGERS,
  JUGE_PRINCIPAL,
  REFERENCE,
  type ModeleOpenRouter,
} from "./evaluation/openrouter/modeles";
import { verifierLeListing } from "./evaluation/openrouter/verification";
import type { Vecteur } from "./evaluation/mesures/espace";

/**
 * L'émission de la campagne 2 — les deux finalistes désignés à l'arrêt 2
 * (Gemini 3.7 Flash + GPT-5.6 Luna) génèrent leurs questions sur les concepts
 * figés du 11h58, Haiku via OpenRouter juge la fidélité, et le rapport aveuglé
 * A/B part à Fable pour l'arrêt 3.
 *
 * **La correspondance ne quitte pas le dépôt** cette fois (consigne Fable,
 * 2026-08-24). Elle reste écrite localement pour la reproductibilité.
 *
 * Trois garde-fous :
 * 1. `--emettre` obligatoire, sans quoi le script se contente du plan à sec
 *    (préférer `npm run planifier:campagne2` pour la vue chiffrée seule).
 * 2. Garde-fou de dérive **2×** appliqué séparément à génération et fidélité
 *    (voir `passerParColonneQuestions` + mémoire `garde-fou-derive-2x`).
 * 3. Cache d'embeddings Voyage réutilisé pour les questions Sonnet déjà
 *    plongées au corpus.
 */

const RAPPORTS = join(import.meta.dirname, "evaluation", "rapports", "campagne");

const FINALISTES_IDS = new Set([
  "google/gemini-3.7-flash",
  "openai/gpt-5.6-luna",
]);

function finalistes(): ModeleOpenRouter[] {
  const trouves = CHALLENGERS.filter((c) => FINALISTES_IDS.has(c.id));
  if (trouves.length !== FINALISTES_IDS.size) {
    throw new Error(`Finalistes introuvables. Attendus : ${[...FINALISTES_IDS].join(", ")}.`);
  }
  return trouves;
}

function refuser(motif: string): never {
  console.error(`La campagne 2 ne démarre pas : ${motif}`);
  process.exit(1);
}

function melangerEtiquettes(items: ModeleOpenRouter[]): { etiquette: Etiquette; finaliste: ModeleOpenRouter }[] {
  const etiquettes: Etiquette[] = ["A", "B"];
  if (items.length !== etiquettes.length) {
    throw new Error(`Le mélange attend ${etiquettes.length} finalistes, il en a reçu ${items.length}.`);
  }
  const ordre = [...items];
  for (let i = ordre.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = ordre[i]!;
    ordre[i] = ordre[j]!;
    ordre[j] = tmp;
  }
  return ordre.map((finaliste, rang) => ({ etiquette: etiquettes[rang]!, finaliste }));
}

async function main(): Promise<void> {
  const emettre = process.argv.includes("--emettre");
  console.info(`# Campagne 2 — ${emettre ? "émission" : "plan à sec (ajoute --emettre pour dépenser)"}\n`);

  // 1. Vérifications préalables.
  const refus = await verifierLeListing([REFERENCE, ...finalistes(), JUGE_PRINCIPAL]);
  if (refus.length > 0) {
    console.error("Listing OpenRouter refuse la campagne 2 :");
    for (const r of refus) console.error(`  - ${r.modele.nom} (${r.modele.id}) : ${r.motif}`);
    refuser("le catalogue a bougé, la fiche doit être mise à jour avant d'émettre.");
  }

  // 2. Charger le figé et le cache verdicts (fidélité Sonnet déjà rendue).
  const cheminFige = dernierFige();
  if (!cheminFige) refuser("aucun figé disponible — la référence Sonnet est requise.");
  const fige = lireFige(cheminFige);
  const cache = chargerCache(cheminFige);
  console.info(`Figé : ${basename(cheminFige)} — ${fige.depots.length} dépôts.\n`);

  // 3. Estimation par colonne.
  console.info(`## Estimation par finaliste (plan à sec)\n`);
  const estimations = new Map<string, { generation: number; fidelite: number }>();
  for (const f of finalistes()) {
    const e = estimerColonne(fige, f, JUGE_PRINCIPAL);
    estimations.set(f.id, { generation: e.coutGeneration, fidelite: e.coutFidelite });
    console.info(
      `  ${f.nom.padEnd(20)} — génération ~${e.coutGeneration.toFixed(4)} $, fidélité ~${e.coutFidelite.toFixed(4)} $, total ~${e.coutTotal.toFixed(4)} $ (garde-fous 2× : ${(2 * e.coutGeneration).toFixed(4)} $ / ${(2 * e.coutFidelite).toFixed(4)} $)`,
    );
  }
  const totalEstime = [...estimations.values()].reduce((s, e) => s + e.generation + e.fidelite, 0);
  console.info(`\n**Total estimé** : ~${totalEstime.toFixed(4)} $. Budget de sortie par appel : ${BUDGET_SORTIE_CAMPAGNE} tokens.\n`);

  if (!emettre) {
    console.info(`Rien n'a été émis. Relance avec --emettre pour dépenser.`);
    return;
  }

  // 4. Étiqueter A/B et écrire la correspondance immédiatement (locale).
  const emisA = new Date();
  const etiquetees = melangerEtiquettes(finalistes());
  const horodatage = emisA.toISOString().slice(0, 16).replace("T", "-").replace(":", "h");
  mkdirSync(RAPPORTS, { recursive: true });
  const cheminCorrespondance = join(RAPPORTS, `2-${horodatage}-correspondance.md`);
  const correspondanceProvisoire = etiquetees.map(({ etiquette, finaliste }) => ({
    etiquette,
    score: {
      finaliste,
      depots: [],
      factureGeneration: { in: 0, out: 0, usd: 0, appels: 0 },
      factureFidelite: { in: 0, out: 0, usd: 0, appels: 0 },
      statut: { code: "complete" as const },
    },
  }));
  writeFileSync(cheminCorrespondance, rendreLaCorrespondanceQuestions(correspondanceProvisoire, emisA), "utf8");
  console.info(`\nCorrespondance locale : ${cheminCorrespondance}\n`);

  // 5. Émettre colonne par colonne.
  const scores: { etiquette: Etiquette; score: ScoreDeColonneQuestions }[] = [];
  for (const { etiquette, finaliste } of etiquetees) {
    console.info(`## Colonne ${etiquette}`);
    console.info(`  finaliste : ${finaliste.nom} (${finaliste.id})`);
    const estim = estimations.get(finaliste.id);
    if (!estim) throw new Error(`Estimation introuvable pour ${finaliste.id}.`);
    const score = await passerParColonneQuestions(
      finaliste,
      fige,
      estim.generation,
      estim.fidelite,
      (m) => console.info(m),
    );
    scores.push({ etiquette, score });
    console.info(
      `  ⟶ colonne ${etiquette} finie — génération ${score.factureGeneration.usd.toFixed(4)} $, fidélité ${score.factureFidelite.usd.toFixed(4)} $, statut ${score.statut.code}\n`,
    );
  }

  // 6. Référence Sonnet : mesures géo recalculées + fidélité lue du cache.
  //    Une passe de plongée sur toutes les questions Sonnet (cache Voyage utilisé).
  const textesRef: string[] = [];
  for (const depot of fige.depots) {
    for (const concept of conceptsAQuestionner(depot.concepts, depot.nature)) {
      for (const v of concept.variants ?? []) {
        textesRef.push(v.format === "CLOZE" && v.cloze ? v.cloze.sentence : v.question);
      }
    }
  }
  console.info(`## Référence Sonnet — plongée de ${textesRef.length} questions (cache utilisé).`);
  const passeRef = await plonger(textesRef);
  console.info(`  vecteurs : ${passeRef.calcules} calculés, ${passeRef.enCache} au cache.\n`);
  const vecteurSonnet = (texte: string): Vecteur | null => {
    try {
      return passeRef.vecteur(texte);
    } catch {
      return null;
    }
  };

  const reference: ReferenceSonnetQuestions = {
    depots: fige.depots.map((d) =>
      scoreReferenceSonnet(d, cache.depots[d.nom]?.fidelite, vecteurSonnet),
    ),
  };

  // 7. Rapport aveuglé + correspondance finale.
  const rapport = rendreLeTableauAveugleQuestions(reference, scores, emisA);
  const cheminRapport = join(RAPPORTS, `2-${horodatage}.md`);
  writeFileSync(cheminRapport, rapport, "utf8");
  writeFileSync(cheminCorrespondance, rendreLaCorrespondanceQuestions(scores, emisA), "utf8");

  const totalReel = scores.reduce(
    (s, { score }) => s + score.factureGeneration.usd + score.factureFidelite.usd,
    0,
  );
  console.info(`Rapport aveuglé (à envoyer à Fable) : ${cheminRapport}`);
  console.info(`Correspondance (à garder au dépôt)  : ${cheminCorrespondance}`);
  console.info(`\n**Facture réelle** : ${totalReel.toFixed(4)} $ (estimation ~${totalEstime.toFixed(4)} $).`);
}

main().catch((erreur: unknown) => {
  console.error("La campagne 2 s'est interrompue.", erreur);
  process.exitCode = 1;
});
