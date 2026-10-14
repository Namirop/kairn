import "dotenv/config";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { EXTRACT_ATOMS_PROMPT } from "@/lib/ai/prompts";
import { lireCorpus, type Depot } from "./corpus";
import { dernierFige, lireFige, type DepotFige } from "./fige";
import { SYSTEM_ATTENDUS } from "./juges/attendus";
import { SYSTEM_DOUBLON } from "./juges/doublon";
import { SYSTEM_RESIDU } from "./juges/residu";
import { BANDEAU_DE_CAMPAGNE, BUDGET_SORTIE_CAMPAGNE } from "./openrouter/campagne";
import {
  CHALLENGERS,
  JUGE_PRINCIPAL,
  REFERENCE,
  type ModeleOpenRouter,
} from "./openrouter/modeles";

/**
 * Campagne close, sans commande : voir `docs/outillage.md`, « Les commandes
 * retirées ».
 *
 * Le plan à sec de la campagne 1 : extraction des challengers sur le corpus,
 * plus les juges Haiku (doublon, résidu, attendus) sur leurs concepts. Aucun
 * appel modèle : il lit le figé Sonnet `11h58` et ses verdicts, Sonnet
 * servant de proxy du volume à produire.
 *
 * - La référence Sonnet n'est pas rejouée : le figé `11h58` vaut tel quel, et
 *   c'est pour ça que Haiku reste juge.
 * - Un seul budget de sortie pour tous, celui de Sonnet : un modèle qui déborde
 *   compte comme échec de schéma, on ne lui monte pas le plafond.
 * - Pas de juge de fidélité : il mesure les questions, et ce passage n'en
 *   génère pas.
 *
 * Quatre signes par token en français : ~20 % d'erreur, assez pour un plan.
 */

const CHARS_PAR_TOKEN = 4;
/** L'enveloppe JSON d'un item : accolades, guillemets, noms de champs. */
const SURCHARGE_JSON_ITEM = 30;
/** Recopie de `PAIRES_PAR_APPEL` dans `juges/doublon.ts`. */
const PAIRES_PAR_APPEL = 20;

function tok(texte: string): number {
  return Math.ceil(texte.length / CHARS_PAR_TOKEN);
}

/** Les verdicts déjà rendus au figé, proxy pour dimensionner. */
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
 * L'extraction, un appel par dépôt. Une image compte pour son texte OCR au
 * figé : l'appel OCR en plus est marginal en coût.
 */
function planExtraction(corpus: Depot[], fige: { depots: DepotFige[] }): Plan {
  const parNom = new Map(fige.depots.map((d) => [d.nom, d]));
  const promptTokens = tok(EXTRACT_ATOMS_PROMPT);
  let tokensIn = 0;
  let tokensOut = 0;

  for (const depot of corpus) {
    const figeDepot = parNom.get(depot.nom);
    const texte = figeDepot?.texte ?? depot.texte;
    tokensIn += promptTokens + tok(texte) + 50;

    if (figeDepot) {
      for (const concept of figeDepot.concepts) {
        tokensOut += tok(concept.concept) + concept.tags.reduce((s, t) => s + tok(t), 0);
        tokensOut += SURCHARGE_JSON_ITEM;
      }
      // Enveloppe : `{"atoms": [...], "nature": "FACTUEL", ...}`
      tokensOut += 40;
    }
  }

  return { appels: corpus.length, tokensIn, tokensOut };
}

/** Le juge du doublon : un appel par lot de paires, deux questions par paire. */
function planDoublon(fige: { depots: DepotFige[] }, verdicts: VerdictsFige): Plan {
  const promptTokens = tok(SYSTEM_DOUBLON);
  const parNom = new Map(fige.depots.map((d) => [d.nom, d]));
  const plan: Plan = { appels: 0, tokensIn: 0, tokensOut: 0 };

  for (const [nom, entry] of Object.entries(verdicts.depots)) {
    const paires = entry.doublons ?? [];
    if (paires.length === 0) continue;
    const depot = parNom.get(nom);
    if (!depot) continue;

    // Les paires soumises ne sont pas au figé : la longueur des questions
    // rendues, qui paraphrasent A et B, sert d'indicateur.
    const tokensParPaire = paires.reduce((s, p) => {
      const contenu = (p.questionSurA?.length ?? 0) + (p.questionSurB?.length ?? 0);
      // Plus le texte des deux concepts, ~120 signes chacun d'après le figé.
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

/** Le juge du résidu : un appel par dépôt à trancher, texte du dépôt entier compris. */
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

/** Le juge des attendus : un appel par dépôt qui en a. */
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
