import { EXTRACT_ATOMS_PROMPT } from "@/lib/ai/prompts/extract-atoms";
import type { Depot } from "../corpus";
import type { DepotFige } from "../fige";
import { SYSTEM_ATTENDUS } from "../juges/attendus";
import { SYSTEM_DOUBLON } from "../juges/doublon";
import { SYSTEM_RESIDU } from "../juges/residu";
import type { ModeleOpenRouter } from "../openrouter/modeles";

/**
 * L'estimation par colonne — extraction du challenger + trois juges Haiku sur
 * les signalements que produira cette colonne. Sert au plan à sec (aucun appel)
 * comme au garde-fou de dérive (règle 2× de la campagne).
 *
 * Le proxy est Sonnet : ses tokens d'entrée sont les tokens qu'un challenger
 * verra sur le même texte, ses tokens de sortie sont un ordre de grandeur du
 * volume rendu. Marge d'erreur ~20 % assumée pour un plan à sec ; la facture
 * réelle se lit sur OpenRouter dépôt par dépôt à l'émission.
 */

const CHARS_PAR_TOKEN = 4;
/** Approximation surface JSON par item (accolades, guillemets, noms de champs). */
export const SURCHARGE_JSON_ITEM = 30;
/** Nombre de paires de doublon par appel juge, voir `PAIRES_PAR_APPEL` dans `doublon.ts`. */
export const PAIRES_PAR_APPEL = 20;

export function tok(texte: string): number {
  return Math.ceil(texte.length / CHARS_PAR_TOKEN);
}

/**
 * Structure minimale des verdicts figés — projection assez large pour accepter
 * les fichiers `verdicts/<figé>.json` et `CacheDeMesure` du module de cache.
 * On lit seulement les tailles et les questions du doublon ; le reste n'est
 * regardé que pour compter.
 */
export type VerdictsFige = {
  depots: Record<
    string,
    {
      doublons?: readonly { questionSurA: string | null; questionSurB: string | null }[];
      residu?: { manques: readonly unknown[]; inventions: readonly unknown[] };
      attendus?: readonly unknown[];
    }
  >;
};

export type Plan = {
  appels: number;
  tokensIn: number;
  tokensOut: number;
};

export function ajouterPlans(a: Plan, b: Plan): Plan {
  return {
    appels: a.appels + b.appels,
    tokensIn: a.tokensIn + b.tokensIn,
    tokensOut: a.tokensOut + b.tokensOut,
  };
}

export function couterPlan(plan: Plan, modele: ModeleOpenRouter): number {
  return (plan.tokensIn * modele.prixInParM + plan.tokensOut * modele.prixOutParM) / 1_000_000;
}

/** L'extraction, un appel par dépôt. Voir `planifier-la-campagne.ts` pour les détails. */
export function planExtraction(corpus: Depot[], fige: { depots: DepotFige[] }): Plan {
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
      tokensOut += 40;
    }
  }

  return { appels: corpus.length, tokensIn, tokensOut };
}

/** Le juge du doublon — un appel par lot de {@link PAIRES_PAR_APPEL} paires. */
export function planDoublon(fige: { depots: DepotFige[] }, verdicts: VerdictsFige): Plan {
  const promptTokens = tok(SYSTEM_DOUBLON);
  const parNom = new Map(fige.depots.map((d) => [d.nom, d]));
  let plan: Plan = { appels: 0, tokensIn: 0, tokensOut: 0 };

  for (const [nom, entry] of Object.entries(verdicts.depots)) {
    const paires = entry.doublons ?? [];
    if (paires.length === 0) continue;
    if (!parNom.get(nom)) continue;

    const tokensParPaire = paires.reduce((s, p) => {
      const contenu = (p.questionSurA?.length ?? 0) + (p.questionSurB?.length ?? 0);
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
      plan.tokensOut += parts.length * (2 * 50 + SURCHARGE_JSON_ITEM) + 30;
    }
  }

  return plan;
}

/** Le juge du résidu — un appel par dépôt qui porte des manques ou inventions. */
export function planResidu(fige: { depots: DepotFige[] }, verdicts: VerdictsFige): Plan {
  const promptTokens = tok(SYSTEM_RESIDU);
  const parNom = new Map(fige.depots.map((d) => [d.nom, d]));
  let plan: Plan = { appels: 0, tokensIn: 0, tokensOut: 0 };

  for (const [nom, entry] of Object.entries(verdicts.depots)) {
    const manques = entry.residu?.manques ?? [];
    const inventions = entry.residu?.inventions ?? [];
    if (manques.length + inventions.length === 0) continue;
    const depot = parNom.get(nom);
    if (!depot) continue;

    const items = manques.length + inventions.length;
    plan.appels += 1;
    plan.tokensIn += promptTokens + tok(depot.texte) + items * 60 + 80;
    plan.tokensOut += items * (30 + SURCHARGE_JSON_ITEM) + 30;
  }

  return plan;
}

/** Le juge des attendus — un appel par dépôt qui porte des attendus. */
export function planAttendus(verdicts: VerdictsFige): Plan {
  const promptTokens = tok(SYSTEM_ATTENDUS);
  let plan: Plan = { appels: 0, tokensIn: 0, tokensOut: 0 };

  for (const entry of Object.values(verdicts.depots)) {
    const attendus = entry.attendus ?? [];
    if (attendus.length === 0) continue;
    plan.appels += 1;
    plan.tokensIn += promptTokens + attendus.length * 150 + 60;
    plan.tokensOut += attendus.length * (40 + SURCHARGE_JSON_ITEM) + 30;
  }

  return plan;
}
