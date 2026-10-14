import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lireFige, type ConceptFige, type DepotFige, type VariantFige } from "./fige";
import { jugerLaFideliteVia, jugerLesDoublonsVia, type Facture } from "./openrouter/juges";
import {
  JUGE_PRINCIPAL,
  JUGES_CANDIDATS,
  KIMI_K2_0905_ECARTE,
  type ModeleOpenRouter,
} from "./openrouter/modeles";

/**
 * Arrêt 1 : validation d'un juge candidat avant campagne (~0,10 $ les douze
 * appels). Campagne close, sans commande : voir `docs/outillage.md`, « Les
 * commandes retirées ».
 *
 * Deux volets contre le figé `2026-08-20-11h58` :
 *
 * 1. Six paires témoins au juge du doublon, contre l'attendu écrit à la main.
 *    Critère : ≥ 5/6, et les deux paires non indépendantes (15, 16) sont
 *    obligatoires : ces jumeaux sont ce que la géométrie ne sait pas trancher,
 *    donc la raison d'être du juge.
 *
 * 2. Six lots au juge de la fidélité : deux propres (04, 18), deux portant des
 *    infidèles connues, deux moyens. Critère : accord ≥ 80 % par question avec
 *    les verdicts Haiku, aucun faux positif sur les propres — un KO inventé
 *    dégrade la fidélité mesurée sans rattrapage possible en aval.
 *
 *   npx tsx scripts/evaluation/valider-le-juge.ts                     # JUGE_PRINCIPAL
 *   npx tsx scripts/evaluation/valider-le-juge.ts -- --candidat=<id>  # un de JUGES_CANDIDATS
 *
 * Un nouveau candidat se déclare d'abord comme constante dans `modeles.ts`.
 */

const FIGE = join(import.meta.dirname, "concepts", "2026-08-20-11h58.json");

/**
 * Le double de `TOKENS_DES_JUGES` : sur six paires groupées, certains modèles
 * (GLM-5) épuisent le budget en raisonnement invisible avant de rendre. La
 * campagne, un dépôt à la fois, reste sur `TOKENS_DES_JUGES`.
 */
const MAX_TOKENS_VALIDATION = 8000;

/**
 * `undefined` garde le défaut du client, `{ effort: "low" }`. `false` pour les
 * fournisseurs qui refusent le paramètre en 404 (Kimi via Novita) et les
 * modèles sans raisonnement (Haiku).
 */
function reasoningPour(
  juge: ModeleOpenRouter,
): { effort: "low" | "medium" | "high" } | false | undefined {
  if (juge.id === KIMI_K2_0905_ECARTE.id) return false;
  if (juge.id === JUGE_PRINCIPAL.id) return false;
  return undefined;
}

type AttenduDoublon = "independants" | "non independants";

type PaireTemoin = {
  depot: string;
  /** Indices 1-based des concepts A et B dans `depot.concepts`. */
  conceptA: number;
  conceptB: number;
  attendu: AttenduDoublon;
  /** Une ligne pour lire le tableau sans le figé sous les yeux. */
  intitule: string;
};

/** Les six paires témoins de l'arrêt 1, exactement celles de la fiche. */
const PAIRES_TEMOINS: PaireTemoin[] = [
  {
    depot: "05-affirmation-fausse.txt",
    conceptA: 2,
    conceptB: 1,
    attendu: "independants",
    intitule: "CREATE INDEX verrou ↔ comportement à l'interruption",
  },
  {
    depot: "09-fait-pratique.txt",
    conceptA: 1,
    conceptB: 2,
    attendu: "independants",
    intitule: "courbes-même-altitude ↔ équidistance",
  },
  {
    depot: "11-sigles-scientifiques.txt",
    conceptA: 1,
    conceptB: 2,
    attendu: "independants",
    intitule: "catégorisation 3 bandes ↔ UVC/ozone",
  },
  {
    depot: "11-sigles-scientifiques.txt",
    conceptA: 1,
    conceptB: 4,
    attendu: "independants",
    intitule: "catégorisation 3 bandes ↔ UVA/derme",
  },
  {
    depot: "15-redondance-interne.txt",
    conceptA: 2,
    conceptB: 3,
    attendu: "non independants",
    intitule: "les jumeaux du rassasiement",
  },
  {
    depot: "16-concepts-imbriques.txt",
    conceptA: 1,
    conceptB: 2,
    attendu: "non independants",
    intitule: "fond épais ↔ sauce qui attache",
  },
];

type CategorieLot = "propre" | "infidele" | "moyen";

type LotFidelite = {
  depot: string;
  /** Indice 1-based du concept dans `depot.concepts`. */
  concept: number;
  categorie: CategorieLot;
  /** Le nombre de KO rendus par Haiku au rapport `11h58`, pour la comparaison. */
  koHaiku: number;
};

/** Les six lots fidélité de l'arrêt 1. */
const LOTS_FIDELITE: LotFidelite[] = [
  { depot: "04-explication-maladroite.txt", concept: 1, categorie: "propre", koHaiku: 0 },
  { depot: "18-anglais.txt", concept: 1, categorie: "propre", koHaiku: 0 },
  { depot: "08-observation-scientifique.txt", concept: 3, categorie: "infidele", koHaiku: 1 },
  { depot: "27-idee-enfouie.txt", concept: 3, categorie: "infidele", koHaiku: 1 },
  { depot: "02-paragraphe-technique.txt", concept: 1, categorie: "moyen", koHaiku: 0 },
  { depot: "10-notes-decousues.txt", concept: 1, categorie: "moyen", koHaiku: 0 },
];

function extrairePaire(
  fige: { depots: DepotFige[] },
  temoin: PaireTemoin,
): { un: string; deux: string; proximite: number } {
  const depot = fige.depots.find((d) => d.nom === temoin.depot);
  if (!depot) throw new Error(`Dépôt introuvable dans le figé : ${temoin.depot}`);
  const a = depot.concepts[temoin.conceptA - 1];
  const b = depot.concepts[temoin.conceptB - 1];
  if (!a || !b) {
    throw new Error(
      `Concept manquant sur ${temoin.depot} — demandés ${temoin.conceptA} et ${temoin.conceptB}, présents ${depot.concepts.length}.`,
    );
  }
  return { un: a.concept, deux: b.concept, proximite: 0 };
}

function extraireConcept(
  fige: { depots: DepotFige[] },
  lot: LotFidelite,
): { concept: string; variants: VariantFige[] } {
  const depot = fige.depots.find((d) => d.nom === lot.depot);
  if (!depot) throw new Error(`Dépôt introuvable dans le figé : ${lot.depot}`);
  const brut: ConceptFige | undefined = depot.concepts[lot.concept - 1];
  if (!brut) {
    throw new Error(
      `Concept ${lot.concept} manquant sur ${lot.depot} — présents ${depot.concepts.length}.`,
    );
  }
  if (!brut.variants || brut.variants.length === 0) {
    throw new Error(
      `Concept ${lot.concept} de ${lot.depot} n'a pas de questions figées — arrêt 1 impossible sur ce lot.`,
    );
  }
  return { concept: brut.concept, variants: brut.variants };
}

function totaux(factures: Facture[]): { in: number; out: number; usd: number; ms: number } {
  return factures.reduce(
    (acc, f) => ({
      in: acc.in + f.inputTokens,
      out: acc.out + f.outputTokens,
      usd: acc.usd + f.coutUsd,
      ms: acc.ms + f.latencyMs,
    }),
    { in: 0, out: 0, usd: 0, ms: 0 },
  );
}

async function volet1Doublon(
  fige: { depots: DepotFige[] },
  juge: ModeleOpenRouter,
): Promise<{ passe: boolean; factures: Facture[] }> {
  console.info("\n## Volet 1 — juge du doublon, 6 paires témoins\n");

  // Un seul appel pour les six paires : c'est ce que fait le juge en campagne,
  // et Alibaba (Qwen) aplatit `{paires: [...]}` quand un seul item est soumis,
  // ce que Zod refuse.
  const paires = PAIRES_TEMOINS.map((temoin) => extrairePaire(fige, temoin));
  const { verdicts, facture } = await jugerLesDoublonsVia(
    juge,
    "témoins arrêt 1",
    paires,
    MAX_TOKENS_VALIDATION,
    reasoningPour(juge),
  );

  let corrects = 0;
  let jumeauxSauves = true;
  for (let i = 0; i < PAIRES_TEMOINS.length; i++) {
    const temoin = PAIRES_TEMOINS[i];
    const verdict = verdicts[i];
    if (!temoin || !verdict) throw new Error(`Verdict manquant à la paire #${i + 1}.`);

    const rendu =
      verdict.independants === null
        ? "abstention"
        : verdict.independants
          ? "independants"
          : "non independants";
    const juste = verdict.independants !== null && rendu === temoin.attendu;
    if (juste) corrects += 1;
    if (temoin.attendu === "non independants" && !juste) jumeauxSauves = false;

    console.info(
      `${juste ? "✓" : "✗"} ${temoin.depot.replace(/\.[^.]+$/, "")} — ${temoin.intitule}`,
    );
    console.info(`     attendu : ${temoin.attendu}    rendu : ${rendu}`);
    if (verdict.questionSurA) console.info(`     A ← ${verdict.questionSurA}`);
    if (verdict.questionSurB) console.info(`     B ← ${verdict.questionSurB}`);
    console.info("");
  }

  console.info(
    `     appel groupé : ${facture.inputTokens} in / ${facture.outputTokens} out, ${(facture.coutUsd * 100).toFixed(2)} ¢, ${facture.latencyMs} ms`,
  );

  const passe = corrects >= 5 && jumeauxSauves;
  console.info(
    `→ Volet 1 : ${corrects}/6 corrects, jumeaux ${jumeauxSauves ? "tenus" : "LIBÉRÉS"} — ${
      passe ? "PASSE" : "ÉCHOUE"
    } (critère : ≥ 5/6 et les deux non indépendants obligatoires)`,
  );

  return { passe, factures: [facture] };
}

async function volet2Fidelite(
  fige: { depots: DepotFige[] },
  juge: ModeleOpenRouter,
): Promise<{ passe: boolean; factures: Facture[] }> {
  console.info("\n## Volet 2 — juge de la fidélité, 6 lots sondage\n");
  const factures: Facture[] = [];
  let totalQuestions = 0;
  let accords = 0;
  let fauxPositifsPropres = 0;

  for (const lot of LOTS_FIDELITE) {
    const { concept, variants } = extraireConcept(fige, lot);
    const { verdicts, facture } = await jugerLaFideliteVia(
      juge,
      concept,
      variants,
      MAX_TOKENS_VALIDATION,
      reasoningPour(juge),
    );
    factures.push(facture);

    const koQwen = verdicts.filter((v) => v.juste === false).length;
    // Référence question par question : les verdicts Haiku du figé `11h58`.
    const verdictsHaiku = lireVerdictsHaiku(lot);
    let accordsLot = 0;
    for (let i = 0; i < verdicts.length; i++) {
      const rendu = verdicts[i]?.juste;
      const attendu = verdictsHaiku[i];
      totalQuestions += 1;
      if (rendu === attendu) {
        accords += 1;
        accordsLot += 1;
      }
    }

    if (lot.categorie === "propre" && koQwen > 0) fauxPositifsPropres += koQwen;

    const etiquette =
      lot.categorie === "propre" ? "propre" : lot.categorie === "infidele" ? "infidèle" : "moyen";
    console.info(`${lot.depot.replace(/\.[^.]+$/, "")} concept ${lot.concept} (${etiquette})`);
    console.info(
      `  Haiku : ${lot.koHaiku}/${variants.length} KO    Qwen : ${koQwen}/${variants.length} KO    accord : ${accordsLot}/${variants.length}`,
    );
    for (let i = 0; i < verdicts.length; i++) {
      const v = verdicts[i];
      if (!v) continue;
      const attenduH = verdictsHaiku[i];
      const marque = v.juste === attenduH ? " " : "≠";
      const rendu = v.juste === null ? "?" : v.juste ? "ok" : "KO";
      const attendu = attenduH === null || attenduH === undefined ? "?" : attenduH ? "ok" : "KO";
      console.info(`    ${marque} Q${i + 1} : Qwen ${rendu}, Haiku ${attendu} — ${v.motif}`);
    }
    console.info(
      `    ${facture.inputTokens} in / ${facture.outputTokens} out, ${(facture.coutUsd * 100).toFixed(2)} ¢, ${facture.latencyMs} ms`,
    );
    console.info("");
  }

  const tauxAccord = (accords / totalQuestions) * 100;
  const passe = tauxAccord >= 80 && fauxPositifsPropres === 0;
  console.info(
    `→ Volet 2 : accord ${accords}/${totalQuestions} (${tauxAccord.toFixed(1)} %), faux positifs sur lots propres : ${fauxPositifsPropres} — ${
      passe ? "PASSE" : "ÉCHOUE"
    } (critères : ≥ 80 % et 0 faux positif sur propres)`,
  );

  return { passe, factures };
}

const VERDICTS_HAIKU: {
  depots: Record<string, { fidelite: Record<string, { juste: boolean | null }[]> }>;
} = JSON.parse(
  readFileSync(join(import.meta.dirname, "verdicts", "2026-08-20-11h58.json"), "utf8"),
);

/** Les verdicts Haiku d'un lot, tels que sauvegardés dans `verdicts/…json`. */
function lireVerdictsHaiku(lot: LotFidelite): (boolean | null)[] {
  const depot = VERDICTS_HAIKU.depots[lot.depot];
  if (!depot) throw new Error(`Verdicts introuvables pour ${lot.depot}`);
  const concepts = Object.keys(depot.fidelite);
  const clef = concepts[lot.concept - 1];
  if (!clef) throw new Error(`Verdicts introuvables pour ${lot.depot} concept ${lot.concept}`);
  const rendus = depot.fidelite[clef];
  if (!rendus) throw new Error(`Verdicts vides pour ${lot.depot} concept ${lot.concept}`);
  return rendus.map((v) => v.juste);
}

function choisirJuge(): ModeleOpenRouter {
  const arg = process.argv.find((a) => a.startsWith("--candidat="));
  if (!arg) return JUGE_PRINCIPAL;
  const id = arg.slice("--candidat=".length).trim();
  const trouve = JUGES_CANDIDATS.find((m) => m.id === id);
  if (!trouve) {
    throw new Error(
      `Identifiant inconnu : « ${id} ». Ajoute une constante dans scripts/evaluation/openrouter/modeles.ts avant de lancer la validation.`,
    );
  }
  return trouve;
}

async function main(): Promise<void> {
  const juge: ModeleOpenRouter = choisirJuge();
  console.info(`# Arrêt 1 — validation du juge candidat : ${juge.nom} (${juge.id})`);
  console.info(
    `Prix catalogue : ${juge.prixInParM} $ in / ${juge.prixOutParM} $ out par million de tokens.`,
  );

  const fige = lireFige(FIGE);
  const doublon = await volet1Doublon(fige, juge);
  const fidelite = await volet2Fidelite(fige, juge);

  const factures = [...doublon.factures, ...fidelite.factures];
  const tot = totaux(factures);
  console.info(
    `\n## Facture — ${factures.length} appels, ${tot.in} tokens in, ${tot.out} tokens out, ${tot.usd.toFixed(4)} $ (${tot.ms} ms cumulés)`,
  );

  const valide = doublon.passe && fidelite.passe;
  console.info(
    `\n## Conclusion — ${valide ? "juge VALIDÉ" : "juge NON VALIDÉ"} : doublon ${
      doublon.passe ? "passe" : "échoue"
    }, fidélité ${fidelite.passe ? "passe" : "échoue"}.`,
  );
  if (!valide) process.exitCode = 1;
}

main().catch((erreur: unknown) => {
  console.error("Validation interrompue.", erreur);
  process.exitCode = 1;
});
