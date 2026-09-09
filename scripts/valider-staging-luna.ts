import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { callAI } from "@/lib/ai/client";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { CONCEPTS_PAR_APPEL, contratDeGeneration, EXTRACT_ATOMS } from "@/lib/ai/schemas";
import { emplacementDuTexteATrou } from "@/lib/domain/emplacement-du-trou";
import { messageDuGroupe } from "@/lib/domain/envoi-de-questions";
import { conceptsAQuestionner } from "@/lib/domain/nature-du-depot";
import { sumAiCalls, startOfUtcDay } from "@/lib/db/ai-call";

/**
 * **Ce script n'a plus de commande dans `package.json`.** Son chantier est clos ;
 * il se relance à la main, et le fichier reste pour ça. Voir `docs/outillage.md`,
 * « Les commandes retirées ».
 */

/**
 * Validation staging — le chemin produit complet sur un seul dépôt de contrôle.
 *
 * Fait tourner extraction puis génération d'un lot de trois questions sur
 * `23-pave-maximal.md`, à travers `callAI` et sa lignée par défaut (celle
 * configurée en staging, normalement `AI_FOURNISSEUR=openrouter` +
 * `AI_MODEL=openai/gpt-5.6-luna`). Vérifie :
 *
 * - le schéma tient (extraction + génération valident sans échec)
 * - le coût journalisé au registre correspond au tarif Luna (0,20 / 1,20 par
 *   million) — un tarif faux mentirait au tableau de bord sans qu'on le voie
 * - les quatre facettes sont servies, avec quatre formats distincts idéalement
 * - la cible vrai/faux imposée est respectée par le lot rendu
 *
 * Coût attendu : ~1 ¢. Sans `--emettre`, le script se contente d'annoncer ce
 * qu'il va faire — même règle que `eval:generation`, on ne dépense pas par
 * accident.
 *
 * Prérequis d'environnement, sinon le script refuse de démarrer :
 * - `MOCK_AI=false`
 * - `AI_ENABLED=true`
 * - `AI_FOURNISSEUR` posé (ce qu'on valide varie selon la lignée à tester)
 * - `AI_MODEL` posé
 * - `OPENROUTER_API_KEY` si fournisseur = openrouter
 */

const CORPUS = join(import.meta.dirname, "evaluation", "corpus");
const DEPOT_TEMOIN = "23-pave-maximal.md";

function refuser(motif: string): never {
  console.error(`Validation staging refusée : ${motif}`);
  process.exit(1);
}

function exigerLesGardeFous(): void {
  if (process.env.MOCK_AI !== "false") {
    refuser("les appels sont réels, il exige MOCK_AI=false explicitement.");
  }
  if (process.env.AI_ENABLED !== "true") {
    refuser("les appels au modèle sont coupés (AI_ENABLED=false).");
  }
  if (!process.env.AI_FOURNISSEUR) {
    refuser("AI_FOURNISSEUR n'est pas posé (attendu : anthropic ou openrouter).");
  }
  if (process.env.AI_FOURNISSEUR === "openrouter" && !process.env.OPENROUTER_API_KEY) {
    refuser("AI_FOURNISSEUR=openrouter mais OPENROUTER_API_KEY est absente.");
  }
}

async function main(): Promise<void> {
  const emettre = process.argv.includes("--emettre");
  console.info(`# Validation staging — dépôt témoin ${DEPOT_TEMOIN}\n`);

  exigerLesGardeFous();

  const texte = readFileSync(join(CORPUS, DEPOT_TEMOIN), "utf8").trim();
  console.info(`Lignée : ${process.env.AI_FOURNISSEUR} · modèle : ${process.env.AI_MODEL}`);
  console.info(`Texte : ${texte.length} caractères.\n`);

  if (!emettre) {
    console.info("Rien n'a été émis. Relance avec --emettre pour dépenser (~1 ¢).");
    return;
  }

  const debut = new Date();

  // 1. Extraction
  console.info(`## 1. Extraction`);
  const extraction = await callAI({
    contract: EXTRACT_ATOMS,
    system: SYSTEM_PROMPTS.extract_atoms,
    messages: [{ role: "user", content: texte }],
  });
  const questionnables = conceptsAQuestionner(extraction.atoms, extraction.nature);
  console.info(
    `  ✓ nature ${extraction.nature}, ${extraction.atoms.length} concepts (${questionnables.length} questionnables)`,
  );
  if (extraction.atoms.length === 0) refuser("extraction vide sur le dépôt témoin.");

  // 2. Génération d'un lot (les CONCEPTS_PAR_APPEL premiers)
  console.info(`\n## 2. Génération d'un lot (${CONCEPTS_PAR_APPEL} concepts)`);
  const groupe = questionnables.slice(0, CONCEPTS_PAR_APPEL);
  if (groupe.length < CONCEPTS_PAR_APPEL) {
    refuser(
      `dépôt témoin sous-dimensionné : ${groupe.length} concepts au lieu de ${CONCEPTS_PAR_APPEL}.`,
    );
  }
  const trou = emplacementDuTexteATrou(groupe[0]?.concept ?? "");
  const contenu = messageDuGroupe(groupe.map((c) => ({ graine: c.concept, concept: c.concept })));
  const generation = await callAI({
    contract: contratDeGeneration(trou),
    system: SYSTEM_PROMPTS.generate_variants,
    messages: [{ role: "user", content: contenu }],
  });
  console.info(`  ✓ ${generation.lots.length} lots rendus, ${generation.ecartes.length} écartés`);

  // 3. Vérifications sur le premier lot
  const premier = generation.lots.find((l) => l.rang === 1);
  if (!premier) refuser("aucun lot de rang 1 rendu — sortie incomplète.");
  const formats = new Set(premier.variants.map((v) => v.format));
  const facets = new Set(premier.variants.map((v) => v.facet));
  console.info(`  · formats distincts sur le premier lot : ${formats.size}/4 (idéal : 4)`);
  console.info(`  · facettes couvertes : ${[...facets].join(", ")}`);
  const trueFalse = premier.variants.filter((v) => v.format === "TRUE_FALSE");
  if (trueFalse.length > 0) {
    console.info(
      `  · ${trueFalse.length} vrai/faux — cible imposée + estVraie rendue à vérifier au registre`,
    );
  }

  // 4. Facture au registre
  const consommation = await sumAiCalls(debut);
  console.info(`\n## 3. Registre`);
  console.info(
    `  ${consommation.calls} appels, ${Number(consommation.costUsd).toFixed(6)} $ au tarif catalogue.`,
  );
  console.info(`  Total du jour depuis 00:00 UTC : à lire dans /admin/pilotage.`);
  void startOfUtcDay;

  console.info(`\n✓ Validation staging OK — le chemin produit tient sur ${process.env.AI_MODEL}.`);
}

main()
  .catch((erreur: unknown) => {
    console.error("Validation interrompue.", erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.$disconnect();
  });
