import { z } from "zod";
import { callAI } from "@/lib/ai/client";
import type { ContratDeSortie } from "@/lib/ai/schemas";
import type { Rapproche } from "../mesures/signaux";
import { MODELE_DES_JUGES, MOTIF_MAXIMUM, TOKENS_DES_JUGES } from "./modele";

/**
 * Le juge du résidu tranche les deux sens de la fidélité d'extraction : une
 * phrase qu'aucun concept ne couvre au-dessus du plancher est-elle à retenir ou
 * du bruit ? Un concept qu'aucune phrase ne soutient ajoute-t-il un élément ?
 *
 * Il reçoit le dépôt entier, mais pas les autres concepts : le signal a déjà
 * écarté les phrases couvertes. Un appel par dépôt signalé, manques et
 * inventions groupés.
 */

const verdictManque = z.object({
  numero: z
    .number()
    .int()
    .describe("Le numéro de la phrase jugée, tel que présenté (### Phrase #N)."),
  retenir: z
    .boolean()
    .describe(
      "true si la phrase porte une idée qui mérite d'être retenue et qu'aucun concept ne couvre. false si c'est du bruit, une transition, un fragment sans contenu propre.",
    ),
  motif: z
    .string()
    .describe("Une phrase courte qui nomme l'idée manquante, ou la nature du bruit."),
});

const verdictInvention = z.object({
  numero: z
    .number()
    .int()
    .describe("Le numéro du concept jugé, tel que présenté (### Concept #N)."),
  soutenu: z
    .boolean()
    .describe(
      "true si tout ce que le concept affirme est présent dans le texte. false s'il ajoute un élément — chiffre, cause, mécanisme — qui n'y figure pas ou qu'on ne peut qu'y lire entre les lignes.",
    ),
  motif: z
    .string()
    .describe("Une phrase courte qui nomme l'élément ajouté, ou confirme le soutien."),
});

const sortieLue = z.object({
  manques: z.array(verdictManque).describe("Un verdict par phrase soumise, dans l'ordre reçu."),
  inventions: z
    .array(verdictInvention)
    .describe("Un verdict par concept soumis, dans l'ordre reçu."),
});

const residuForme = sortieLue.extend({
  manques: z.array(
    verdictManque.extend({ motif: verdictManque.shape.motif.min(1).max(MOTIF_MAXIMUM) }),
  ),
  inventions: z.array(
    verdictInvention.extend({ motif: verdictInvention.shape.motif.min(1).max(MOTIF_MAXIMUM) }),
  ),
});

/** Les verdicts arrivent bruts, avec leur `numero`. L'appariement se fait à l'usage. */
const residuValidation = sortieLue;

/**
 * `null` porte l'abstention : le juge a omis cet item d'un lot. Elle se compte
 * à part dans le rapport, sans retry ni verdict inventé.
 */
export type VerdictManque = { retenir: boolean | null; motif: string };
export type VerdictInvention = { soutenu: boolean | null; motif: string };
export type SortieResidu = { manques: VerdictManque[]; inventions: VerdictInvention[] };

export const CONTRAT_RESIDU: ContratDeSortie<z.infer<typeof residuValidation>> = {
  purpose: "juge_residu",
  forme: residuForme,
  validation: residuValidation,
};

export const SYSTEM_RESIDU = `Tu tranches deux questions symétriques sur un dépôt et ses concepts.

**Manque.** Pour chaque phrase signalée, décide si elle porte une idée qui
mérite d'être retenue et qu'aucun des concepts du dépôt ne couvre. Une
transition, une mise en forme, un fragment sans contenu propre, un renvoi au
lecteur (« voir plus loin ») : ce n'est pas à retenir. Une observation, une
règle, un exemple qui n'apparaît pas ailleurs : c'est à retenir.

**Invention.** Pour chaque concept signalé, décide s'il est entièrement soutenu
par le texte. Un chiffre, une date, une cause, un mécanisme, un nom : chacun
doit se trouver dans le dépôt. Un concept qui reformule fidèlement une phrase
diffuse est soutenu. Un concept qui ajoute un détail qu'on n'y lit qu'entre les
lignes ne l'est pas.

Chaque candidat porte un numéro (### Phrase #N, ### Concept #N). **Reporte ce
numéro dans le verdict.** Un verdict par candidat, jamais deux, jamais zéro.

Le motif est court : nomme l'idée manquante, l'élément ajouté, ou la nature du
bruit. Pas d'introduction, pas de conclusion.`;

export function decrireManque(entree: Rapproche, rang: number): string {
  return `### Phrase #${rang + 1}\n${entree.texte}`;
}

export function decrireInvention(entree: Rapproche, rang: number): string {
  return `### Concept #${rang + 1}\n${entree.texte}`;
}

/** Un item non rendu par le juge — même chaîne pour résidu et attendus. */
export const MOTIF_ABSTENTION_JUGE = "non rendu par le juge";

function apparier<V extends { numero: number }, T>(
  candidats: unknown[],
  rendus: V[],
  garder: (verdict: V) => T,
  abstention: T,
): T[] {
  const parNumero = new Map(rendus.map((verdict) => [verdict.numero, verdict]));

  return candidats.map((_, rang) => {
    const verdict = parNumero.get(rang + 1);
    return verdict ? garder(verdict) : abstention;
  });
}

/** Un verdict par candidat, dans l'ordre. Sans candidat, aucun appel. */
export async function jugerLeResidu(
  nom: string,
  texte: string,
  manques: Rapproche[],
  inventions: Rapproche[],
): Promise<SortieResidu> {
  if (manques.length === 0 && inventions.length === 0) {
    return { manques: [], inventions: [] };
  }

  const sections = [
    `Dépôt : ${nom}`,
    "",
    "## Texte du dépôt",
    "",
    texte,
    "",
    `## ${manques.length} phrase(s) signalée(s) au manque — attendus : verdicts #1 à #${manques.length}`,
    "",
    manques.length === 0 ? "(aucune)" : manques.map(decrireManque).join("\n\n"),
    "",
    `## ${inventions.length} concept(s) signalé(s) à l'invention — attendus : verdicts #1 à #${inventions.length}`,
    "",
    inventions.length === 0 ? "(aucun)" : inventions.map(decrireInvention).join("\n\n"),
  ];

  const sortie = await callAI({
    contract: CONTRAT_RESIDU,
    system: SYSTEM_RESIDU,
    messages: [{ role: "user", content: [{ type: "text", text: sections.join("\n") }] }],
    model: MODELE_DES_JUGES,
    maxTokens: TOKENS_DES_JUGES,
  });

  return {
    manques: apparier<(typeof sortie.manques)[number], VerdictManque>(
      manques,
      sortie.manques,
      (v) => ({ retenir: v.retenir, motif: v.motif.trim() }),
      { retenir: null, motif: MOTIF_ABSTENTION_JUGE },
    ),
    inventions: apparier<(typeof sortie.inventions)[number], VerdictInvention>(
      inventions,
      sortie.inventions,
      (v) => ({ soutenu: v.soutenu, motif: v.motif.trim() }),
      { soutenu: null, motif: MOTIF_ABSTENTION_JUGE },
    ),
  };
}
