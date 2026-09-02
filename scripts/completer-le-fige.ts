import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { appliquerCapDuBanc } from "./evaluation/cap-du-banc";
import type { ConceptFige, DepotFige } from "./evaluation/fige";

appliquerCapDuBanc();

/**
 * Combler les trous d'un figé sans réémettre ce qui a déjà réussi.
 *
 * Un passage complet dépense quelques dollars, et une panne réseau isolée ou
 * un lot de questions raté par Haiku laisse un trou silencieux dans le figé —
 * un dépôt sans concepts (le cas de `27` sur le figé du 18/08), ou des
 * concepts sans variants dispersés sur plusieurs dépôts. Ce script les
 * retrouve et **ne rejoue que ce qui manque** :
 *
 * - dépôts sans concepts (échec d'extraction, avec ou sans motif écrit) →
 *   `evaluerDepot` en repart du texte du corpus, extraction et générations
 *   comprises.
 * - concepts non-douteux sans variants → `rejouerDepot` sur un dépôt réduit
 *   aux seuls concepts à combler, et fusion des variants neufs dans le figé.
 *
 * Le script écrit un nouveau figé daté du moment, quitte à ce que `completer`
 * de `fige.ts` reprenne les dépôts inchangés du précédent. Un rejeu ordinaire
 * (`eval:rejeu`) suit ensuite si on veut regénérer proprement l'ensemble.
 *
 *   MOCK_AI=false npm run evaluer:completer                 # le plan
 *   MOCK_AI=false npm run evaluer:completer -- --emettre    # complétion réelle
 *
 * Comme `eval:generation`, il exige `MOCK_AI=false` explicitement et ne
 * dépense qu'à l'ajout de `--emettre`.
 */

const RAPPORTS = join(import.meta.dirname, "evaluation", "rapports");

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

  const { lireCorpus } = await import("./evaluation/corpus");
  const { evaluerDepot, rejouerDepot } = await import("./evaluation/execution");
  const { dernierFige, lireFige, retenirVariant } = await import("./evaluation/fige");
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
    // Un dépôt sans concepts sans motif de rejet est un échec silencieux :
    // le figé d'avant la persistance d'`echec` n'écrivait rien pour eux. On
    // le rattrape ici en même temps que les échecs explicites.
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
  // Plancher : une extraction par dépôt à rextraire, plus une génération pour
  // chacun de ses concepts. Plafond : on n'estime pas mieux tant qu'on n'a pas
  // extrait, mais l'ordre de grandeur est bon.
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
    // La conversion en DepotFige : on reprend la même forme que `ecrireFige`
    // pour ces dépôts-là, en portant l'échec et les reprises s'il y en a.
    const reconstitue: DepotFige = {
      nom: evalue.nom,
      texte: evalue.texte,
      lecture: evalue.lecture,
      nature: evalue.nature,
      langue: evalue.langue,
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

  // On réécrit un figé daté du moment, avec l'ensemble des dépôts (complétés
  // et inchangés) sérialisés directement. `ecrireFige` ne s'applique pas ici :
  // il attend des `DepotEvalue` frais, et on repart de `DepotFige` déjà
  // convertis. Le format JSON est le même, contrôlé par `figeSchema`.
  const depotsFinaux = [...parNomDuFige.values()].sort((a, b) => a.nom.localeCompare(b.nom));
  const DOSSIER = joinChemin(import.meta.dirname, "evaluation", "concepts");
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
