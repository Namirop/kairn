import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { NATURES_DE_DEPOT } from "@/lib/domain/nature-du-depot";
import type { DepotEvalue } from "./execution";

/**
 * Les concepts figés : ce qu'un passage complet a extrait, pour qu'un passage
 * ultérieur mesure la génération de questions seule, sur les mêmes concepts.
 * Relu par un schéma : un figé abîmé à la main doit échouer bruyamment.
 */

const DOSSIER = join(import.meta.dirname, "concepts");

const figeSchema = z.object({
  emisA: z.string(),
  modele: z.string(),
  depots: z.array(
    z.object({
      nom: z.string(),
      texte: z.string(),
      lecture: z.object({ langue: z.string().nullable(), exploitable: z.boolean() }).optional(),
      // Facultative : des figés de référence n'en portent pas, et les rendre
      // invalides ferait taire toute la référence d'un coup.
      nature: z.enum(NATURES_DE_DEPOT).optional(),
      rejet: z.string().nullable(),
      // Sans `echec` et sans concepts : rejet du produit (motif dans `rejet`).
      // Avec `echec` : panne technique. Le rapport les lit différemment.
      echec: z.object({ motif: z.string() }).optional(),
      /** Nombre d'essais supplémentaires consommés sur ce dépôt. Zéro le plus souvent. */
      reprises: z.number().int().nonnegative().optional(),
      concepts: z.array(
        z.object({
          concept: z.string(),
          tags: z.array(z.string()),
          uncertain: z.boolean(),
          /**
           * L'échec du lot qui portait ce concept, quand la génération n'a rien
           * rendu de servable. Sans lui, un concept sans variants se lirait
           * comme un rejet volontaire.
           */
          echec: z.object({ motif: z.string() }).optional(),
          /**
           * Les questions telles qu'elles ont été servies. Facultatives pour la
           * même raison que `nature`.
           *
           * Le rejeu les regénère ; elles servent aux mesures (radotage, juge de
           * fidélité), qui se recalculent ainsi sans passage de génération. Un
           * sous-ensemble d'un Variant, pour ne pas lier le format du figé au
           * contrat de génération.
           */
          variants: z
            .array(
              z.object({
                facet: z.string(),
                format: z.string(),
                question: z.string(),
                answerKey: z.string(),
                options: z.array(z.string()).nullable(),
                correctIndex: z.number().int().nullable(),
                /**
                 * La charge d'un texte à trou. Le radotage compare `sentence` :
                 * le champ `question` d'un CLOZE porte au plus une consigne. Les
                 * leurres sont gardés parce qu'un contrôle vérifie qu'aucun n'est
                 * une forme acceptée ; sans eux, il signalerait toujours zéro.
                 */
                cloze: z
                  .object({
                    sentence: z.string(),
                    accepted: z.array(z.string()),
                    leurres: z.array(z.string()).optional(),
                  })
                  .nullable()
                  .optional(),
              }),
            )
            .optional(),
        }),
      ),
    }),
  ),
});

export type CorpusFige = z.infer<typeof figeSchema>;
export type DepotFige = CorpusFige["depots"][number];
export type ConceptFige = DepotFige["concepts"][number];
export type VariantFige = NonNullable<ConceptFige["variants"]>[number];

/** Ce qu'on garde d'une question rendue : de quoi la juger, rien de plus. */
export function retenirVariant(
  variant: DepotEvalue["concepts"][number]["variants"][number],
): VariantFige {
  return {
    facet: variant.facet,
    format: variant.format,
    question: variant.question,
    answerKey: variant.answerKey,
    options: variant.options ?? null,
    correctIndex: variant.correctIndex ?? null,
    cloze: variant.cloze ?? null,
  };
}

/**
 * Le figé précédent, s'il est lisible et ne vient pas du mode mock. Abîmé, il
 * n'interrompt pas le banc : on le signale et on écrit sans lui.
 */
function lirePrecedent(chemin: string): CorpusFige | null {
  try {
    const precedent = figeSchema.parse(JSON.parse(readFileSync(chemin, "utf8")));

    return precedent.modele === "mock" ? null : precedent;
  } catch (erreur) {
    console.warn(`Figé précédent illisible, il ne sera pas repris (${chemin}) :`, erreur);

    return null;
  }
}

/**
 * Ce que le passage a produit, complété par les dépôts du figé précédent qu'il
 * n'a pas traités et qui sont toujours au corpus. Sans ça, un passage restreint
 * écrirait une référence amputée ; le filtre par le corpus fait sortir un dépôt
 * retiré du dossier.
 *
 * L'en-tête décrit le passage qui écrit ; les dépôts repris viennent d'un
 * passage antérieur.
 */
function completer(depots: DepotFige[], corpus: string[]): DepotFige[] {
  const precedent = dernierFige();
  const ancien = precedent === undefined ? null : lirePrecedent(precedent);

  if (!ancien) return depots;

  const traites = new Set(depots.map((depot) => depot.nom));
  const repris = ancien.depots.filter(
    (depot) => !traites.has(depot.nom) && corpus.includes(depot.nom),
  );

  return [...depots, ...repris].sort((un, deux) => un.nom.localeCompare(deux.nom));
}

export function ecrireFige(
  evaluations: DepotEvalue[],
  modele: string,
  emisA: Date,
  corpus: string[],
): string {
  const fige: CorpusFige = {
    emisA: emisA.toISOString(),
    modele,
    depots: completer(
      evaluations.map((evaluation) => ({
        nom: evaluation.nom,
        texte: evaluation.texte,
        lecture: evaluation.lecture,
        nature: evaluation.nature,
        rejet: evaluation.rejet,
        echec: evaluation.echec ? { motif: evaluation.echec.motif } : undefined,
        reprises: evaluation.reprises > 0 ? evaluation.reprises : undefined,
        concepts: evaluation.concepts.map((evalue) => ({
          ...evalue.concept,
          echec: evalue.echec ? { motif: evalue.echec.motif } : undefined,
          // Absent plutôt que vide : un tableau vide se lirait « zéro question
          // rendue » au lieu de « aucune demandée ».
          variants: evalue.variants.length === 0 ? undefined : evalue.variants.map(retenirVariant),
        })),
      })),
      corpus,
    ),
  };

  mkdirSync(DOSSIER, { recursive: true });
  const chemin = join(
    DOSSIER,
    `${emisA.toISOString().slice(0, 16).replace("T", "-").replace(":", "h")}.json`,
  );
  writeFileSync(chemin, `${JSON.stringify(fige, null, 2)}\n`, "utf8");

  return chemin;
}

export function lireFige(chemin: string): CorpusFige {
  const fige = figeSchema.parse(JSON.parse(readFileSync(chemin, "utf8")));

  // Un figé écrit en mock ne mesure rien : le rejeu comparerait des questions
  // réelles à des concepts de fixture.
  if (fige.modele === "mock") {
    throw new Error(`${chemin} a été écrit en mode mock : il ne sert pas de référence.`);
  }

  return fige;
}

/** Le figé le plus récent, quand on ne dit pas lequel rejouer. */
export function dernierFige(): string | undefined {
  try {
    const fichiers = readdirSync(DOSSIER)
      .filter((nom) => nom.endsWith(".json"))
      .sort();

    const dernier = fichiers.at(-1);

    return dernier === undefined ? undefined : join(DOSSIER, dernier);
  } catch {
    return undefined;
  }
}
