import { PROMPT_D_EXTRACTION } from "@/lib/ai/prompts";
import type { Depot } from "../corpus";
import type { DepotFige } from "../fige";
import { SYSTEM_ATTENDUS } from "../juges/attendus";
import { PAIRES_PAR_APPEL, SYSTEM_DOUBLON } from "../juges/doublon";
import { SYSTEM_RESIDU } from "../juges/residu";
import type { ModeleOpenRouter } from "../openrouter/modeles";

/**
 * L'estimation par colonne : extraction du challenger et trois juges sur les
 * signalements qu'elle produira. Sert au plan à sec (aucun appel) et au
 * garde-fou de dérive (une colonne qui dépasse 2× son estimation s'arrête).
 *
 * Le proxy est la référence : mêmes tokens d'entrée qu'un challenger sur le
 * même texte, ordre de grandeur pour la sortie. Marge d'environ 20 % assumée ;
 * la facture réelle se lit dépôt par dépôt à l'émission.
 */

const CARACTERES_PAR_TOKEN = 4;
/** Approximation surface JSON par item (accolades, guillemets, noms de champs). */
export const SURCHARGE_JSON_ITEM = 30;
export { PAIRES_PAR_APPEL };

export function tok(texte: string): number {
  return Math.ceil(texte.length / CARACTERES_PAR_TOKEN);
}

/**
 * Projection minimale des verdicts figés, assez large pour accepter
 * `verdicts/<figé>.json` comme le `CacheDeMesure`. Seules les questions du
 * doublon sont lues ; le reste ne sert qu'à compter.
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

/**
 * L'extraction, un appel par dépôt. Une image compte pour son texte OCR au
 * figé : l'appel OCR en plus est marginal en coût.
 */
export function planExtraction(corpus: Depot[], fige: { depots: DepotFige[] }): Plan {
  const parNom = new Map(fige.depots.map((d) => [d.nom, d]));
  const tokensDuPrompt = tok(PROMPT_D_EXTRACTION);
  let tokensIn = 0;
  let tokensOut = 0;

  for (const depot of corpus) {
    const figeDepot = parNom.get(depot.nom);
    const texte = figeDepot?.texte ?? depot.texte;
    tokensIn += tokensDuPrompt + tok(texte) + 50;

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
  const tokensDuPrompt = tok(SYSTEM_DOUBLON);
  const parNom = new Map(fige.depots.map((d) => [d.nom, d]));
  const plan: Plan = { appels: 0, tokensIn: 0, tokensOut: 0 };

  for (const [nom, entry] of Object.entries(verdicts.depots)) {
    const paires = entry.doublons ?? [];
    if (paires.length === 0) continue;
    if (!parNom.get(nom)) continue;

    // Les paires soumises ne sont pas au figé : la longueur des questions
    // rendues, qui paraphrasent A et B, sert d'indicateur.
    const tokensParPaire = paires.reduce((s, p) => {
      const contenu = (p.questionSurA?.length ?? 0) + (p.questionSurB?.length ?? 0);
      // Plus le texte des deux concepts, ~120 signes chacun d'après le figé.
      return s + Math.ceil(contenu / CARACTERES_PAR_TOKEN) + 60;
    }, 0);

    const nbLots = Math.ceil(paires.length / PAIRES_PAR_APPEL);
    for (let lot = 0; lot < nbLots; lot++) {
      const debut = lot * PAIRES_PAR_APPEL;
      const parts = paires.slice(debut, debut + PAIRES_PAR_APPEL);
      const enTete = tok(
        `Dépôt : ${nom}\n\n${parts.length} paire(s) à juger — verdicts #1 à #${parts.length}.\n\n`,
      );
      plan.appels += 1;
      plan.tokensIn += tokensDuPrompt + enTete + tokensParPaire * (parts.length / paires.length);
      plan.tokensOut += parts.length * (2 * 50 + SURCHARGE_JSON_ITEM) + 30;
    }
  }

  return plan;
}

/** Le juge du résidu — un appel par dépôt qui porte des manques ou inventions. */
export function planResidu(fige: { depots: DepotFige[] }, verdicts: VerdictsFige): Plan {
  const tokensDuPrompt = tok(SYSTEM_RESIDU);
  const parNom = new Map(fige.depots.map((d) => [d.nom, d]));
  const plan: Plan = { appels: 0, tokensIn: 0, tokensOut: 0 };

  for (const [nom, entry] of Object.entries(verdicts.depots)) {
    const manques = entry.residu?.manques ?? [];
    const inventions = entry.residu?.inventions ?? [];
    if (manques.length + inventions.length === 0) continue;
    const depot = parNom.get(nom);
    if (!depot) continue;

    const elements = manques.length + inventions.length;
    plan.appels += 1;
    plan.tokensIn += tokensDuPrompt + tok(depot.texte) + elements * 60 + 80;
    plan.tokensOut += elements * (30 + SURCHARGE_JSON_ITEM) + 30;
  }

  return plan;
}

/** Le juge des attendus — un appel par dépôt qui porte des attendus. */
export function planAttendus(verdicts: VerdictsFige): Plan {
  const tokensDuPrompt = tok(SYSTEM_ATTENDUS);
  const plan: Plan = { appels: 0, tokensIn: 0, tokensOut: 0 };

  for (const entry of Object.values(verdicts.depots)) {
    const attendus = entry.attendus ?? [];
    if (attendus.length === 0) continue;
    plan.appels += 1;
    plan.tokensIn += tokensDuPrompt + attendus.length * 150 + 60;
    plan.tokensOut += attendus.length * (40 + SURCHARGE_JSON_ITEM) + 30;
  }

  return plan;
}
