import { z } from "zod";
import { callAI } from "@/lib/ai/client";
import type { AiContract } from "@/lib/ai/schemas";
import type { Paire } from "../mesures/signaux";
import { MODELE_DES_JUGES, MOTIF_MAXIMUM, TOKENS_DES_JUGES } from "./modele";

/**
 * Le juge du doublon — le troisième juge, ajouté à l'arrêt 1.
 *
 * Il tranche ce que la géométrie ne sait pas trancher : deux concepts au-dessus
 * du plancher disent-ils la même affirmation, ou seulement le même sujet ? Le
 * premier relevé du 18 août avait prouvé que la paire la plus proche du corpus
 * (0,810 sur `05`) portait deux affirmations contraires, et que les jumeaux de
 * `15` plafonnaient à 0,768 en dessous — aucun plancher ne sépare.
 *
 * **La question posée est le test d'indépendance du produit lui-même**, celui
 * que le prompt d'extraction énonce déjà sans savoir se l'appliquer :
 *
 *   Quelqu'un qui connaît A mais ignore B : reste-t-il une question à lui poser
 *   sur B, sur laquelle il pourrait se tromper ? Et dans l'autre sens ?
 *
 * Cette formulation sépare correctement les trois familles du relevé : les
 * contradictoires sont indépendants (connaître le verrou ne dit rien de
 * l'interruption — il reste une question), les concepts distincts d'un même
 * sujet aussi, les jumeaux et la règle-plus-instance ne le sont pas.
 */

const SENS = ["A_couvre_B", "B_couvre_A", "equivalents"] as const;

const paireLue = z.object({
  independants: z
    .boolean()
    .describe(
      "true si dans les deux sens il reste une question sur laquelle celui qui ne connaît pas l'autre concept pourrait se tromper. false dès qu'un sens n'a plus de question à poser.",
    ),
  sens: z
    .enum(SENS)
    .nullable()
    .describe(
      "null si independants=true. Sinon : A_couvre_B si connaître A rend B superflu, B_couvre_A dans l'autre sens, equivalents si les deux couvrent l'autre.",
    ),
  motif: z
    .string()
    .describe("Une phrase courte qui nomme la question restante ou l'absorption constatée."),
});

const sortieLue = z.object({
  paires: z
    .array(paireLue)
    .describe("Un verdict par paire soumise, dans l'ordre reçu."),
});

const doublonForme = sortieLue.extend({
  paires: z.array(paireLue.extend({ motif: paireLue.shape.motif.min(1).max(MOTIF_MAXIMUM) })),
});

const doublonValidation = sortieLue.transform((sortie) => ({
  paires: sortie.paires.map((paire) => ({
    independants: paire.independants,
    sens: paire.independants ? null : (paire.sens ?? "equivalents"),
    motif: paire.motif.trim(),
  })),
}));

export type VerdictDoublon = z.infer<typeof doublonValidation>["paires"][number];

const CONTRAT: AiContract<z.infer<typeof doublonValidation>> = {
  purpose: "juge_doublon",
  forme: doublonForme,
  validation: doublonValidation,
};

const SYSTEM = `Tu tranches si deux concepts d'un même dépôt sont indépendants.

Pour chaque paire, applique **dans les deux sens** le test suivant :

  Quelqu'un qui connaît A mais ignore B : reste-t-il une question à lui poser
  sur B, sur laquelle il pourrait se tromper ?

- Si les deux sens rendent oui, la paire est **indépendante**.
- Sinon, elle ne l'est pas. Précise alors le sens de l'absorption : A_couvre_B
  quand connaître A rend B superflu, B_couvre_A dans l'autre sens, equivalents
  si chacun couvre l'autre.

Deux affirmations contraires sur le même sujet restent indépendantes : savoir
qu'un verrou existe ne dit rien de ce que fait ce verrou. Deux affirmations
distinctes sur un même mécanisme aussi : l'une n'entraîne pas l'autre. En
revanche, une règle et son instance directe ne le sont pas, ni une reformulation
en synonymes.

Le motif est court : il nomme la question qui reste, ou l'absorption qu'on
constate. Pas d'introduction, pas de conclusion.`;

/** Ce qu'on présente au juge pour une paire. `A` et `B` restent stables pour la lecture du motif. */
function decrirePaire(paire: Paire, rang: number): string {
  return [`### Paire ${rang + 1}`, `A. ${paire.un}`, `B. ${paire.deux}`].join("\n");
}

/**
 * Combien de paires par appel.
 *
 * Découpé à vingt parce que `23-pave-maximal` porte 63 paires et que la sortie
 * contrainte s'est arrêtée à 57 sur un premier passage à quatre mille tokens :
 * la grammaire trouve un point d'arrêt valide avant d'avoir couvert le lot. Un
 * lot plus court laisse une marge confortable pour chaque motif, et le surcoût
 * est nul — les paires en trop iraient dans un appel supplémentaire au même
 * tarif par paire. Voir §4 de la fiche instrument.
 */
const PAIRES_PAR_APPEL = 20;

/**
 * Combien d'appels le juge fera pour un dépôt donné. Exporté pour le plan
 * chiffré : `mesurer-le-corpus.ts` en a besoin avant d'émettre.
 */
export function appelsPour(paires: number): number {
  return Math.ceil(paires / PAIRES_PAR_APPEL);
}

async function jugerUnLot(
  nom: string,
  paires: Paire[],
  offset: number,
): Promise<VerdictDoublon[]> {
  const messages = [
    {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: [
            `Dépôt : ${nom}`,
            "",
            `${paires.length} paire(s) à juger.`,
            "",
            paires.map((paire, rang) => decrirePaire(paire, offset + rang)).join("\n\n"),
          ].join("\n"),
        },
      ],
    },
  ];

  const sortie = await callAI({
    contract: CONTRAT,
    system: SYSTEM,
    messages,
    model: MODELE_DES_JUGES,
    maxTokens: TOKENS_DES_JUGES,
  });

  if (sortie.paires.length !== paires.length) {
    throw new Error(
      `Le juge du doublon a rendu ${sortie.paires.length} verdicts pour ${paires.length} paires sur ${nom}.`,
    );
  }

  return sortie.paires;
}

/**
 * Rend un verdict par paire soumise, dans l'ordre.
 *
 * Découpé en lots de {@link PAIRES_PAR_APPEL} paires par appel — voir la
 * constante pour la raison. Un dépôt sans paire ne fait aucun appel : le juge
 * ne voit que ce qu'il y a à juger.
 */
export async function jugerLesDoublons(nom: string, paires: Paire[]): Promise<VerdictDoublon[]> {
  const verdicts: VerdictDoublon[] = [];

  for (let offset = 0; offset < paires.length; offset += PAIRES_PAR_APPEL) {
    const lot = paires.slice(offset, offset + PAIRES_PAR_APPEL);
    const rendus = await jugerUnLot(nom, lot, offset);
    verdicts.push(...rendus);
  }

  return verdicts;
}
