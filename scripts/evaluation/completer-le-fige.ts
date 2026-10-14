import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { appliquerCapDuBanc } from "./cap-du-banc";
import type { ConceptFige, DepotFige } from "./fige";

appliquerCapDuBanc();

/**
 * Combler les trous d'un figé sans réémettre ce qui a déjà réussi : un passage
 * complet coûte quelques dollars, et une panne isolée laisse un trou silencieux.
 * Ne rejoue que ce qui manque :
 *
 * - dépôts sans concepts (échec d'extraction, avec ou sans motif) →
 *   `evaluerDepot` depuis le texte du corpus, générations comprises ;
 * - concepts non douteux sans variants → `rejouerDepot` sur un dépôt réduit à
 *   ces concepts, puis fusion dans le figé.
 *
 * Écrit un nouveau figé daté du moment, avec tous les dépôts, complétés ou non.
 *
 *   MOCK_AI=false npm run evaluer:completer                 # le plan
 *   MOCK_AI=false npm run evaluer:completer -- --emettre    # complétion réelle
 *
 * Exige `MOCK_AI=false` explicitement et ne dépense qu'avec `--emettre`.
 */

const RAPPORTS = join(import.meta.dirname, "rapports");

function refuser(motif: string): never {
  console.error(`Le complément ne démarre pas : ${motif}`);
  process.exit(1);
}

function nomDuRapport(instant: Date): string {
  return `completion-${instant.toISOString().slice(0, 16).replace("T", "-").replace(":", "h")}.md`;
}

async function main(): Promise<void> {
  if (process.env.MOCK_AI !== "false") {
    refuser("il consomme de vrais appels, il exige donc MOCK_AI=false explicitement.");
  }

  if (process.env.AI_ENABLED !== "true") {
    refuser("les appels au modèle sont coupés (AI_ENABLED=false).");
  }

  const { lireCorpus } = await import("./corpus");
  const { evaluerDepot, rejouerDepot } = await import("./execution");
  const { dernierFige, lireFige, retenirVariant } = await import("./fige");
  const { join: joinChemin } = await import("node:path");
  const { sumAiCalls } = await import("@/lib/db/ai-call");
  const { lireReservationsDuJour } = await import("@/lib/db/ai-quota");
  const { CONCEPTS_PAR_APPEL } = await import("@/lib/ai/schemas");

  const chemin = dernierFige();
  if (chemin === undefined) refuser("aucun figé à compléter. Lance d'abord un passage.");

  const fige = lireFige(chemin);
  const corpus = lireCorpus();
  const parNom = new Map(corpus.map((depot) => [depot.nom, depot]));

  const aRextraire: DepotFige[] = [];
  const aCompleter: DepotFige[] = [];

  for (const depot of fige.depots) {
    // Sans concepts ni motif de rejet, c'est un échec silencieux : les anciens
    // figés n'écrivaient pas `echec`.
    const enEchec =
      depot.echec !== undefined || (depot.rejet === null && depot.concepts.length === 0);
    if (enEchec) {
      aRextraire.push(depot);
      continue;
    }
    if (depot.concepts.some((c) => !c.variants && !c.uncertain)) {
      aCompleter.push(depot);
    }
  }

  const totalRegenerations = aCompleter.reduce(
    (cumul, depot) =>
      cumul +
      Math.ceil(
        depot.concepts.filter((c) => !c.variants && !c.uncertain).length / CONCEPTS_PAR_APPEL,
      ),
    0,
  );
  const totalExtractions = aRextraire.length;
  // Un plancher : les générations des dépôts à réextraire ne se comptent
  // qu'après extraction.
  const appels = totalExtractions + totalRegenerations;

  console.info(`Complément du figé : ${basename(chemin)}`);
  console.info(
    `À reprendre : ${totalExtractions} extraction(s) — ${aRextraire.map((d) => d.nom).join(", ") || "aucune"}.`,
  );
  console.info(
    `À combler : ${totalRegenerations} lot(s) de questions sur ${aCompleter.length} dépôt(s) — ${aCompleter.map((d) => d.nom).join(", ") || "aucun"}.`,
  );
  console.info(
    `Plafond du jour : ${await lireReservationsDuJour()}/${process.env.AI_DAILY_CALL_CAP} déjà réservés.\n`,
  );

  if (totalExtractions + totalRegenerations === 0) {
    console.info("Rien à compléter. Le figé est intact.");
    return;
  }

  if (!process.argv.includes("--emettre")) {
    console.info(
      `Rien n'a été émis. Relance avec --emettre pour dépenser (~${appels} appels au plancher).`,
    );
    return;
  }

  const debut = new Date();
  const journal: string[] = [];

  const parNomDuFige = new Map(fige.depots.map((depot) => [depot.nom, depot]));

  for (const enEchec of aRextraire) {
    const source = parNom.get(enEchec.nom);
    if (!source) {
      console.warn(`Dépôt ${enEchec.nom} absent du corpus, ignoré.`);
      continue;
    }
    console.info(`… extraction de ${enEchec.nom}`);
    const evalue = await evaluerDepot(source);
    // La même forme que celle écrite par `ecrireFige`.
    const reconstitue: DepotFige = {
      nom: evalue.nom,
      texte: evalue.texte,
      lecture: evalue.lecture,
      nature: evalue.nature,
      rejet: evalue.rejet,
      echec: evalue.echec ? { motif: evalue.echec.motif } : undefined,
      reprises: evalue.reprises > 0 ? evalue.reprises : undefined,
      concepts: evalue.concepts.map((c) => ({
        ...c.concept,
        variants: c.variants.length === 0 ? undefined : c.variants.map(retenirVariant),
      })),
    };
    parNomDuFige.set(enEchec.nom, reconstitue);
    journal.push(
      `- **${enEchec.nom}** : ${evalue.concepts.length} concept(s) extrait(s)` +
        (evalue.echec ? ` — échec : ${evalue.echec.motif}` : "") +
        (evalue.reprises > 0 ? ` — ${evalue.reprises} reprise(s)` : ""),
    );
  }

  for (const depot of aCompleter) {
    const manquants = depot.concepts.filter((c) => !c.variants && !c.uncertain);
    console.info(`… complément de ${depot.nom} (${manquants.length} concept(s) à combler)`);
    const partiel: DepotFige = { ...depot, concepts: manquants };
    const rendu = await rejouerDepot(partiel);
    const nouveaux = new Map<string, ConceptFige["variants"]>();
    const echecs = new Map<string, string>();
    for (const evalue of rendu.concepts) {
      if (evalue.variants.length > 0) {
        nouveaux.set(evalue.concept.concept, evalue.variants.map(retenirVariant));
      } else if (evalue.echec) {
        echecs.set(evalue.concept.concept, evalue.echec.motif);
      }
    }
    const conceptsFusionnes = depot.concepts.map((c) => {
      if (nouveaux.has(c.concept)) {
        // Une régénération réussie efface un ancien échec sur ce concept.
        const { echec: _, ...reste } = c;
        return { ...reste, variants: nouveaux.get(c.concept) };
      }
      if (echecs.has(c.concept)) {
        return { ...c, echec: { motif: echecs.get(c.concept)! } };
      }
      return c;
    });
    const combles = nouveaux.size;
    parNomDuFige.set(depot.nom, {
      ...depot,
      concepts: conceptsFusionnes,
      reprises: (depot.reprises ?? 0) + rendu.reprises,
    });
    journal.push(
      `- **${depot.nom}** : ${combles}/${manquants.length} lot(s) comblé(s)` +
        (rendu.reprises > 0 ? ` — ${rendu.reprises} reprise(s)` : ""),
    );
    for (const [concept, motif] of echecs) {
      journal.push(`  - échec sur « ${concept.slice(0, 80)} » : ${motif}`);
    }
  }

  const total = await sumAiCalls(debut);
  console.info(`\n${total.calls} appels, ${Number(total.costUsd).toFixed(4)} $.`);

  // Sérialisé à la main : `ecrireFige` attend des `DepotEvalue` frais, on a des
  // `DepotFige`. Le format reste celui que `figeSchema` contrôle.
  const depotsFinaux = [...parNomDuFige.values()].sort((a, b) => a.nom.localeCompare(b.nom));
  const DOSSIER = joinChemin(import.meta.dirname, "concepts");
  const cheminNouveau = joinChemin(
    DOSSIER,
    `${debut.toISOString().slice(0, 16).replace("T", "-").replace(":", "h")}.json`,
  );
  mkdirSync(DOSSIER, { recursive: true });
  writeFileSync(
    cheminNouveau,
    `${JSON.stringify({ emisA: debut.toISOString(), modele: fige.modele, depots: depotsFinaux }, null, 2)}\n`,
    "utf8",
  );
  console.info(`Figé complété écrit dans ${cheminNouveau}`);

  mkdirSync(RAPPORTS, { recursive: true });
  const cheminRapport = join(RAPPORTS, nomDuRapport(debut));
  writeFileSync(
    cheminRapport,
    [
      `# Complément du figé — ${debut.toISOString().slice(0, 16).replace("T", " ")} UTC`,
      "",
      `Source : \`${basename(chemin)}\` · sortie : \`${basename(cheminNouveau)}\``,
      "",
      `${total.calls} appels · ${Number(total.costUsd).toFixed(4)} $`,
      "",
      ...journal,
      "",
    ].join("\n"),
    "utf8",
  );
  console.info(`Rapport écrit dans ${cheminRapport}`);
}

main()
  .catch((erreur: unknown) => {
    console.error("Le complément s'est interrompu.", erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.$disconnect();
  });
