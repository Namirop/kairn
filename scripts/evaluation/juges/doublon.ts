import { z } from "zod";
import { callAI } from "@/lib/ai/client";
import type { AiContract } from "@/lib/ai/schemas";
import type { Paire } from "../mesures/signaux";
import { MODELE_DES_JUGES, MOTIF_MAXIMUM, TOKENS_DES_JUGES } from "./modele";

/**
 * Le juge du doublon : deux concepts au-dessus du plancher disent-ils la même
 * affirmation, ou seulement le même sujet ? La géométrie ne sépare pas : la
 * paire la plus proche du corpus (0,810 sur `05`) porte deux affirmations
 * contraires, et les jumeaux de `15` sont dessous, à 0,768.
 *
 * La question posée est le test d'indépendance du prompt d'extraction : qui
 * connaît A mais ignore B, reste-t-il une question sur B où il pourrait se
 * tromper ? Et dans l'autre sens ?
 */

export const SENS_DOUBLON = ["A_couvre_B", "B_couvre_A", "equivalents"] as const;

/**
 * Le juge écrit les deux questions concrètes qui subsistent, et le serveur en
 * déduit l'indépendance et le sens. Un verdict qualifié laisse le juge
 * argumenter pour son biais ; une question à formuler, il doit la trouver ou
 * reconnaître qu'elle n'existe pas.
 */
const paireLue = z.object({
  numero: z.number().int().describe("Le numéro de la paire jugée, tel que présenté (### Paire N)."),
  questionSurB: z
    .string()
    .nullable()
    .describe(
      "La question qu'on poserait sur B à quelqu'un qui connaît A mais ignore B, et sur laquelle il pourrait se tromper. null si aucune question de ce type n'existe — connaître A rend alors B superflu.",
    ),
  questionSurA: z
    .string()
    .nullable()
    .describe(
      "La question qu'on poserait sur A à quelqu'un qui connaît B mais ignore A, et sur laquelle il pourrait se tromper. null si aucune question de ce type n'existe — connaître B rend alors A superflu.",
    ),
});

const sortieLue = z.object({
  paires: z
    .array(paireLue)
    .describe("Un verdict par paire soumise. L'appariement se fait par numéro."),
});

const doublonForme = sortieLue.extend({
  paires: z.array(
    paireLue.extend({
      questionSurA: z.string().min(1).max(MOTIF_MAXIMUM).nullable(),
      questionSurB: z.string().min(1).max(MOTIF_MAXIMUM).nullable(),
    }),
  ),
});

const doublonValidation = sortieLue;

/**
 * `independants: null` = abstention (paire non rendue par le juge). Voir `residu.ts`.
 * `independants` et `sens` sont dérivés des deux questions rendues.
 */
export type VerdictDoublon = {
  independants: boolean | null;
  sens: (typeof SENS_DOUBLON)[number] | null;
  questionSurA: string | null;
  questionSurB: string | null;
};

export const CONTRAT_DOUBLON: AiContract<z.infer<typeof doublonValidation>> = {
  purpose: "juge_doublon",
  forme: doublonForme,
  validation: doublonValidation,
};

export const SYSTEM_DOUBLON = `Tu compares deux concepts A et B d'un même dépôt, et tu rends
pour chacun d'eux **la question concrète** qui subsiste.

Pour chaque paire, produis deux champs :

- **questionSurB** : la question qu'on poserait sur B à quelqu'un qui connaît A
  mais ignore B, et sur laquelle il pourrait se tromper. Une vraie question,
  formulée, comme dans un quiz. Si aucune question de ce type n'existe —
  connaître A donne déjà la réponse à toute question sur B —, rends **null**.
- **questionSurA** : la même chose dans l'autre sens.

Ne rends **pas** de verdict d'indépendance ni de motif : c'est la présence ou
l'absence des questions qui tranche. Deux questions rendues = paire indépendante.
Une seule = un concept couvre l'autre. Zéro = les deux disent la même chose.

Écris la question comme une vraie question, pas comme une description. « Quel est
l'écart entre deux courbes voisines sur une carte, et est-il constant ? » plutôt
que « la constance de l'écart entre courbes ». Si tu ne peux pas l'écrire, c'est
que null est la bonne réponse.

Cas courants qui rendent **deux** questions (paire indépendante) :

- Deux affirmations contraires ou opposées sur le même sujet : les questions
  portent chacune sur ce que fait vraiment chacune, l'existence de l'un ne
  répond pas à ce que fait l'autre.
- Une catégorie et les propriétés d'un de ses membres : la catégorie n'énonce
  pas la propriété du membre — « où les UVC sont-ils arrêtés ? » subsiste même
  quand on sait qu'il existe trois bandes UV qui diffèrent par leur énergie.
- Une définition et une propriété dérivée : la définition n'énonce pas la
  propriété — « l'écart entre courbes voisines est-il constant ? » subsiste
  même quand on sait que les courbes relient les points de même altitude.

Cas courants qui rendent **null** d'un côté :

- Une reformulation en synonymes ou une paraphrase directe.
- Une règle générale et son unique instance présentée dans le texte : « les
  calories liquides ne rassasient pas » vs « la compensation incomplète du
  liquide au repas suivant » — c'est la même affirmation vue sous deux angles,
  aucune question ne subsiste dans un sens.

Chaque paire porte un numéro (### Paire N). **Reporte ce numéro dans le
verdict.** Un verdict par paire, jamais deux, jamais zéro. Pas d'introduction,
pas de conclusion.`;

/** Ce qu'on présente au juge pour une paire. `A` et `B` restent stables pour lire les questions rendues. */
export function decrirePaire(paire: Paire, rang: number): string {
  return [`### Paire ${rang + 1}`, `A. ${paire.un}`, `B. ${paire.deux}`].join("\n");
}

/**
 * Le verdict déduit des deux questions. Partagé avec l'adaptateur OpenRouter
 * (`openrouter/juges.ts`) pour qu'une seule lecture des questions existe.
 */
export function deriverIndependance(
  questionSurABrute: string | null,
  questionSurBBrute: string | null,
): VerdictDoublon {
  const questionSurA = questionSurABrute?.trim() || null;
  const questionSurB = questionSurBBrute?.trim() || null;
  const independants = questionSurA !== null && questionSurB !== null;
  let sens: (typeof SENS_DOUBLON)[number] | null = null;
  if (!independants) {
    if (questionSurA === null && questionSurB === null) sens = "equivalents";
    else if (questionSurB === null) sens = "A_couvre_B";
    else sens = "B_couvre_A";
  }
  return { independants, sens, questionSurA, questionSurB };
}

/**
 * Combien de paires par appel. Sur les 63 paires de `23-pave-maximal`, la
 * sortie contrainte s'est arrêtée à 57 : la grammaire trouve un point d'arrêt
 * valide avant la fin du lot. Vingt laisse de la marge, sans surcoût par paire.
 */
const PAIRES_PAR_APPEL = 20;

/**
 * Combien d'appels le juge fera pour un dépôt donné, pour chiffrer le plan avant
 * d'émettre (`compterLesAppelsDesJuges`, `campagne/execution.ts`).
 */
export function appelsPour(paires: number): number {
  return Math.ceil(paires / PAIRES_PAR_APPEL);
}

async function jugerUnLot(nom: string, paires: Paire[]): Promise<VerdictDoublon[]> {
  const messages = [
    {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: [
            `Dépôt : ${nom}`,
            "",
            `${paires.length} paire(s) à juger — verdicts #1 à #${paires.length}.`,
            "",
            paires.map((paire, rang) => decrirePaire(paire, rang)).join("\n\n"),
          ].join("\n"),
        },
      ],
    },
  ];

  const sortie = await callAI({
    contract: CONTRAT_DOUBLON,
    system: SYSTEM_DOUBLON,
    messages,
    model: MODELE_DES_JUGES,
    maxTokens: TOKENS_DES_JUGES,
  });

  const parNumero = new Map(sortie.paires.map((v) => [v.numero, v]));

  return paires.map((_, rang) => {
    const verdict = parNumero.get(rang + 1);
    if (!verdict) {
      return { independants: null, sens: null, questionSurA: null, questionSurB: null };
    }
    return deriverIndependance(verdict.questionSurA, verdict.questionSurB);
  });
}

/**
 * Rend un verdict par paire soumise, dans l'ordre, par lots de
 * {@link PAIRES_PAR_APPEL}. Un dépôt sans paire ne fait aucun appel.
 */
export async function jugerLesDoublons(nom: string, paires: Paire[]): Promise<VerdictDoublon[]> {
  const verdicts: VerdictDoublon[] = [];

  for (let offset = 0; offset < paires.length; offset += PAIRES_PAR_APPEL) {
    const lot = paires.slice(offset, offset + PAIRES_PAR_APPEL);
    const rendus = await jugerUnLot(nom, lot);
    verdicts.push(...rendus);
  }

  return verdicts;
}
