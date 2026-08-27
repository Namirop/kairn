import "dotenv/config";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { EXTRACT_ATOMS_PROMPT } from "@/lib/ai/prompts/extract-atoms";
import { lireCorpus, type Depot } from "./evaluation/corpus";
import { dernierFige, lireFige, type DepotFige } from "./evaluation/fige";
import { SYSTEM_ATTENDUS } from "./evaluation/juges/attendus";
import { SYSTEM_DOUBLON } from "./evaluation/juges/doublon";
import { SYSTEM_RESIDU } from "./evaluation/juges/residu";
import { BANDEAU_DE_CAMPAGNE, BUDGET_SORTIE_CAMPAGNE } from "./evaluation/openrouter/campagne";
import {
  CHALLENGERS,
  JUGE_PRINCIPAL,
  REFERENCE,
  type ModeleOpenRouter,
} from "./evaluation/openrouter/modeles";

/**
 * Le plan à sec de la campagne 1 — extraction seule des quatre challengers
 * sur les 27 dépôts du corpus, plus les trois juges (doublon, résidu,
 * attendus) qui rejoueront Haiku via OpenRouter sur les concepts que chacun
 * aura rendus. Aucun appel modèle : le script lit le figé Sonnet `11h58` et
 * les verdicts déjà rendus par Haiku, et estime les tokens en prenant Sonnet
 * comme proxy du volume à produire.
 *
 * Trois rappels s'affichent en tête, non négociables :
 *
 * 1. **La colonne de référence Sonnet n'est pas rejouée.** Le figé `11h58` est
 *    valable tel quel — c'est justement pourquoi on garde Haiku comme juge de
 *    la campagne (voir arrêt 1 du 2026-08-21).
 * 2. **Budget de sortie unique** : `BUDGET_SORTIE_CAMPAGNE` tokens pour tous
 *    les challengers, la même barre que Sonnet. Un modèle qui déborde est
 *    compté comme échec de schéma, pas accommodé par un plafond plus haut.
 * 3. **La fidélité ne fait pas partie de la campagne 1.** Elle mesure les
 *    questions, or on ne génère pas de questions à ce passage — l'extraction
 *    suffit à trancher entre challengers sur manque, invention, doublon,
 *    attendus.
 *
 * L'estimation des tokens utilise la règle de pouce chars/4 pour du français
 * — marge d'erreur ~20 % assumée, suffisante pour un plan à sec. Le coût
 * réel se lira sur les factures OpenRouter dépôt par dépôt à l'émission.
 */

const CHARS_PAR_TOKEN = 4;
/** Approximation surface JSON par item (accolades, guillemets, noms de champs). */
const SURCHARGE_JSON_ITEM = 30;
/** Nombre de paires de doublon par appel juge, voir `PAIRES_PAR_APPEL` dans `doublon.ts`. */
const PAIRES_PAR_APPEL = 20;

function tok(texte: string): number {
  return Math.ceil(texte.length / CHARS_PAR_TOKEN);
}

/** Structure des verdicts déjà rendus au figé — sert de proxy pour dimensionner. */
type VerdictsFige = {
  depots: Record<
    string,
    {
      doublons?: { questionSurA: string | null; questionSurB: string | null }[];
      residu?: { manques: { motif: string }[]; inventions: { motif: string }[] };
      attendus?: { couvert: boolean; motif: string }[];
      fidelite?: Record<string, unknown[]>;
    }
  >;
};

type Plan = {
  appels: number;
  tokensIn: number;
  tokensOut: number;
};

function ajouter(a: Plan, b: Plan): Plan {
  return {
    appels: a.appels + b.appels,
    tokensIn: a.tokensIn + b.tokensIn,
    tokensOut: a.tokensOut + b.tokensOut,
  };
}

function couter(plan: Plan, modele: ModeleOpenRouter): number {
  return (plan.tokensIn * modele.prixInParM + plan.tokensOut * modele.prixOutParM) / 1_000_000;
}

/**
 * L'extraction, un appel par dépôt.
 *
 * Tokens d'entrée : SYSTEM `extract_atoms` + texte du dépôt (les images du
 * corpus, une seule, sont approximées par le texte OCR déjà présent au figé
 * Sonnet — le vrai OCR ferait un appel de plus, marginal en coût).
 *
 * Tokens de sortie : ce que Sonnet a rendu au figé (concepts + tags + petits
 * champs de structure). C'est le meilleur proxy du volume qu'un challenger
 * produira, à ~20 % près.
 */
function planExtraction(corpus: Depot[], fige: { depots: DepotFige[] }): Plan {
  const parNom = new Map(fige.depots.map((d) => [d.nom, d]));
  const promptTokens = tok(EXTRACT_ATOMS_PROMPT);
  let tokensIn = 0;
  let tokensOut = 0;

  for (const depot of corpus) {
    const figeDepot = parNom.get(depot.nom);
    // Le texte figé contient le résultat OCR pour les images — c'est ce que le
    // challenger recevra en entrée après une lecture d'image faite en amont.
    const texte = figeDepot?.texte ?? depot.texte;
    tokensIn += promptTokens + tok(texte) + 50;

    if (figeDepot) {
      for (const concept of figeDepot.concepts) {
        tokensOut += tok(concept.concept) + concept.tags.reduce((s, t) => s + tok(t), 0);
        tokensOut += SURCHARGE_JSON_ITEM;
      }
      // Enveloppe : `{"atoms": [...], "langue": "fr", "nature": "FACTUEL", ...}`
      tokensOut += 40;
    }
  }

  return { appels: corpus.length, tokensIn, tokensOut };
}

/**
 * Le juge du doublon — un appel par lot de 20 paires, un dépôt peut porter
 * plusieurs lots. Le contenu d'un appel : `SYSTEM_DOUBLON` + une entête + la
 * liste des paires (deux concepts par paire). La sortie : deux questions
 * (parfois `null`) par paire.
 */
function planDoublon(fige: { depots: DepotFige[] }, verdicts: VerdictsFige): Plan {
  const promptTokens = tok(SYSTEM_DOUBLON);
  const parNom = new Map(fige.depots.map((d) => [d.nom, d]));
  const plan: Plan = { appels: 0, tokensIn: 0, tokensOut: 0 };

  for (const [nom, entry] of Object.entries(verdicts.depots)) {
    const paires = entry.doublons ?? [];
    if (paires.length === 0) continue;
    const depot = parNom.get(nom);
    if (!depot) continue;

    // On ne connaît pas la géométrie exacte des paires soumises, mais Sonnet a
    // rendu des questions dont la longueur est un bon indicateur du texte des
    // deux concepts confrontés (chaque question paraphrase A ou B).
    const tokensParPaire = paires.reduce((s, p) => {
      const contenu = (p.questionSurA?.length ?? 0) + (p.questionSurB?.length ?? 0);
      // Le prompt ajoute le texte des deux concepts — ~120 chars par concept
      // en moyenne d'après le figé —, en plus des questions du verdict.
      return s + Math.ceil(contenu / CHARS_PAR_TOKEN) + 60;
    }, 0);

    const nbLots = Math.ceil(paires.length / PAIRES_PAR_APPEL);
    for (let lot = 0; lot < nbLots; lot++) {
      const debut = lot * PAIRES_PAR_APPEL;
      const parts = paires.slice(debut, debut + PAIRES_PAR_APPEL);
      const enTete = tok(
        `Dépôt : ${nom}\n\n${parts.length} paire(s) à juger — verdicts #1 à #${parts.length}.\n\n`,
      );
      plan.appels += 1;
      plan.tokensIn += promptTokens + enTete + tokensParPaire * (parts.length / paires.length);
      // Sortie : deux questions par paire (~50 tokens chacune) + wrapper `paires: [...]`.
      plan.tokensOut += parts.length * (2 * 50 + SURCHARGE_JSON_ITEM) + 30;
    }
  }

  return plan;
}

/**
 * Le juge du résidu — un appel par dépôt qui a des manques ou des inventions.
 * L'appel contient le texte du dépôt en entier (règle de la fiche pour ce
 * juge-là) plus la liste numérotée des phrases et concepts à trancher.
 */
function planResidu(fige: { depots: DepotFige[] }, verdicts: VerdictsFige): Plan {
  const promptTokens = tok(SYSTEM_RESIDU);
  const parNom = new Map(fige.depots.map((d) => [d.nom, d]));
  const plan: Plan = { appels: 0, tokensIn: 0, tokensOut: 0 };

  for (const [nom, entry] of Object.entries(verdicts.depots)) {
    const manques = entry.residu?.manques ?? [];
    const inventions = entry.residu?.inventions ?? [];
    if (manques.length + inventions.length === 0) continue;
    const depot = parNom.get(nom);
    if (!depot) continue;

    const items = manques.length + inventions.length;
    plan.appels += 1;
    plan.tokensIn += promptTokens + tok(depot.texte) + items * 60 + 80;
    // Sortie : un verdict court par item (~30 tokens).
    plan.tokensOut += items * (30 + SURCHARGE_JSON_ITEM) + 30;
  }

  return plan;
}

/**
 * Le juge des attendus — un appel par dépôt qui a des attendus. Contenu court
 * : chaque attendu et ses concepts candidats désignés par la géométrie.
 */
function planAttendus(verdicts: VerdictsFige): Plan {
  const promptTokens = tok(SYSTEM_ATTENDUS);
  const plan: Plan = { appels: 0, tokensIn: 0, tokensOut: 0 };

  for (const entry of Object.values(verdicts.depots)) {
    const attendus = entry.attendus ?? [];
    if (attendus.length === 0) continue;
    plan.appels += 1;
    plan.tokensIn += promptTokens + attendus.length * 150 + 60;
    plan.tokensOut += attendus.length * (40 + SURCHARGE_JSON_ITEM) + 30;
  }

  return plan;
}

function ligne(nom: string, prix: string, extraction: Plan, juges: Plan, cout: string): string {
  const total = ajouter(extraction, juges);
  return `| ${nom.padEnd(22)} | ${prix.padStart(13)} | ${extraction.appels.toString().padStart(3)} / ${extraction.tokensIn.toString().padStart(6)} / ${extraction.tokensOut.toString().padStart(6)} | ${juges.appels.toString().padStart(3)} / ${juges.tokensIn.toString().padStart(6)} / ${juges.tokensOut.toString().padStart(6)} | ${total.appels.toString().padStart(4)} | ${cout.padStart(6)} $ |`;
}

async function main(): Promise<void> {
  console.info("# Plan à sec — campagne 1\n");
  console.info(BANDEAU_DE_CAMPAGNE);
  console.info();
  console.info("## Rappels non négociables\n");
  console.info("- La colonne de référence Sonnet n'est pas rejouée (figé `11h58` valide).");
  console.info(
    `- Budget de sortie unique : **${BUDGET_SORTIE_CAMPAGNE} tokens**, même barre pour tous. Débordement = échec de schéma.`,
  );
  console.info("- Pas de génération de questions à ce passage, donc pas de juge de fidélité.");
  console.info();

  const cheminFige = dernierFige();
  if (!cheminFige) throw new Error("Aucun figé disponible.");
  const fige = lireFige(cheminFige);
  const cheminVerdicts = join(dirname(cheminFige), "..", "verdicts", basename(cheminFige));
  const verdicts: VerdictsFige = JSON.parse(readFileSync(cheminVerdicts, "utf8"));

  const corpus = lireCorpus();
  const extraction = planExtraction(corpus, fige);
  const doublon = planDoublon(fige, verdicts);
  const residu = planResidu(fige, verdicts);
  const attendus = planAttendus(verdicts);
  const juges = ajouter(ajouter(doublon, residu), attendus);

  console.info(`## Périmètre lu`);
  console.info(
    `- Corpus : ${corpus.length} dépôts (${cheminFige.split(/[\\/]/).slice(-2).join("/")} comme proxy).`,
  );
  console.info(`- Signalements Sonnet (par colonne challenger) :`);
  console.info(
    `  · doublon — ${doublon.appels} appels sur ${nbAppelsDoublonDeptCorpus(verdicts)} dépôts, ${totalPaires(verdicts)} paires réparties en lots de ${PAIRES_PAR_APPEL} max`,
  );
  console.info(
    `  · résidu — ${residu.appels} appels sur ${residu.appels} dépôts, ${totalItemsResidu(verdicts)} items`,
  );
  console.info(
    `  · attendus — ${attendus.appels} appels sur ${attendus.appels} dépôts, ${totalAttendus(verdicts)} attendus`,
  );
  console.info();

  console.info(`## Coût estimé par colonne\n`);
  console.info(
    `| Colonne                | Prix in/out   | Extraction  A / in / out    | Juges Haiku A / in / out | Appels | Coût   |`,
  );
  console.info(
    `|:-----------------------|-------------:|:-----------------------------|:--------------------------|-------:|-------:|`,
  );

  // Ligne référence : rappel non facturé
  const prixRef = `${REFERENCE.prixInParM}/${REFERENCE.prixOutParM}`;
  console.info(
    ligne(
      REFERENCE.nom + " (référence)",
      prixRef,
      { appels: 0, tokensIn: 0, tokensOut: 0 },
      { appels: 0, tokensIn: 0, tokensOut: 0 },
      "0.0000",
    ),
  );
  console.info(`| ↑ non rejouée — figé \`11h58\` valide, colonne déjà payée. |||||||`);

  let coutTotalCampagne = 0;
  for (const c of CHALLENGERS) {
    const prix = `${c.prixInParM}/${c.prixOutParM}`;
    const coutExtraction = couter(extraction, c);
    const coutJuges = couter(juges, JUGE_PRINCIPAL);
    const coutColonne = coutExtraction + coutJuges;
    coutTotalCampagne += coutColonne;
    console.info(ligne(c.nom, prix, extraction, juges, coutColonne.toFixed(4)));
  }
  console.info();
  console.info(
    `**Total campagne 1** : ~${coutTotalCampagne.toFixed(2)} $ (4 challengers × extraction + ${juges.appels} appels Haiku via OpenRouter par colonne).`,
  );
  console.info();
  console.info(
    `Le coût des juges est identique pour chaque colonne (${couter(juges, JUGE_PRINCIPAL).toFixed(4)} $/colonne), l'extraction seule dépend du prix du challenger.`,
  );
  console.info();
  console.info(
    `Marge d'erreur ~20 % (tokens estimés en chars/4). La facture réelle se lira sur OpenRouter, dépôt par dépôt, à l'émission.`,
  );
}

function totalPaires(verdicts: VerdictsFige): number {
  return Object.values(verdicts.depots).reduce((s, d) => s + (d.doublons?.length ?? 0), 0);
}

function totalItemsResidu(verdicts: VerdictsFige): number {
  return Object.values(verdicts.depots).reduce(
    (s, d) => s + (d.residu?.manques.length ?? 0) + (d.residu?.inventions.length ?? 0),
    0,
  );
}

function totalAttendus(verdicts: VerdictsFige): number {
  return Object.values(verdicts.depots).reduce((s, d) => s + (d.attendus?.length ?? 0), 0);
}

function nbAppelsDoublonDeptCorpus(verdicts: VerdictsFige): number {
  return Object.values(verdicts.depots).filter((d) => (d.doublons?.length ?? 0) > 0).length;
}

main().catch((erreur: unknown) => {
  console.error("Le plan à sec s'est interrompu.", erreur);
  process.exitCode = 1;
});
