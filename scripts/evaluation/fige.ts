import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { NATURES_DE_DEPOT } from "@/lib/domain/nature-du-depot";
import type { DepotEvalue } from "./execution";

/**
 * Les concepts figés.
 *
 * Un passage complet écrit ici ce que l'extraction a rendu ; un passage
 * ultérieur repart de ce fichier au lieu de rappeler l'extraction. C'est le
 * seul moyen de mesurer la génération de questions seule : sans lui, les
 * concepts changent d'un passage à l'autre et deux rapports ne se comparent
 * pas.
 *
 * Le fichier est relu par un schéma comme n'importe quelle entrée : un figé
 * abîmé à la main doit échouer bruyamment.
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
      // Facultative : les figés écrits avant ce champ n'en portent pas, et les
      // rendre invalides ferait taire toute la référence d'un coup — `lirePrecedent`
      // se contenterait de prévenir, et le rejeu repartirait de rien.
      nature: z.enum(NATURES_DE_DEPOT).optional(),
      langue: z.string().optional(),
      rejet: z.string().nullable(),
      // Persisté depuis la reprise automatique du banc. Un dépôt sans `echec`
      // et sans concepts est un rejet du produit (motif dans `rejet`) ; un
      // dépôt avec `echec` est une panne technique — les deux se lisent
      // désormais différemment dans le rapport de mesures.
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
           * rendu de servable — silence du modèle sur ce rang, ou lot écarté à
           * la relecture. Absent le plus souvent. Sans lui, un concept sans
           * variants se lisait comme un rejet volontaire, et un motif capturé
           * par le banc partait dans le vide.
           */
          echec: z.object({ motif: z.string() }).optional(),
          /**
           * Les questions telles qu'elles ont été servies.
           *
           * Facultatives, comme `nature` avant elles : les figés écrits avant ce
           * champ n'en portent pas, et les rendre invalides ferait taire toute
           * la référence d'un coup.
           *
           * Elles ne servent pas au rejeu — qui les regénère, c'est son objet —
           * mais aux mesures : le radotage compare les questions d'un même dépôt
           * entre elles, et le juge de fidélité lit un concept avec les siennes.
           * Sans ce champ, ces deux-là exigeaient un passage de génération à
           * chaque fois qu'on voulait recalculer un seuil.
           *
           * Un sous-ensemble des champs d'un Variant, et pas la sortie entière :
           * ce qu'il faut pour juger une question, sans lier le format du figé à
           * chaque évolution du contrat de génération.
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
                 * La charge d'un texte à trou : la phrase avec le trou, les
                 * formes acceptées, et les leurres du coup de pouce. Persistée
                 * depuis que la mesure du radotage s'appuie dessus — le champ
                 * `question` d'un CLOZE porte au mieux une consigne, jamais la
                 * vraie phrase à comparer.
                 *
                 * Les leurres y figurent parce qu'un contrôle les relit : un
                 * leurre qui est une forme acceptée retourne l'aide contre celui
                 * qui la demande, et un rejeu qui ne les garderait pas
                 * signalerait toujours zéro.
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
 * Le figé précédent, quand il est lisible et qu'il ne vient pas du mode mock.
 *
 * Il sert à compléter un passage restreint. Un figé abîmé n'interrompt pas le
 * banc : on le signale et on écrit sans lui.
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
 * n'a pas traités mais qui sont toujours au corpus.
 *
 * Sans cette reprise, un passage restreint — trois dépôts qu'on vient d'ajouter
 * au corpus — écrirait une référence de trois dépôts, et le rejeu suivant
 * mesurerait un corpus amputé sans le dire. Le filtre par le corpus tient
 * l'autre bout : un dépôt retiré du dossier sort de la référence au passage
 * suivant, il n'y survit pas indéfiniment.
 *
 * L'en-tête décrit le passage qui a écrit le fichier ; les dépôts repris, eux,
 * viennent d'un passage antérieur.
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
        langue: evaluation.langue,
        rejet: evaluation.rejet,
        echec: evaluation.echec ? { motif: evaluation.echec.motif } : undefined,
        reprises: evaluation.reprises > 0 ? evaluation.reprises : undefined,
        concepts: evaluation.concepts.map((evalue) => ({
          ...evalue.concept,
          echec: evalue.echec ? { motif: evalue.echec.motif } : undefined,
          // Un concept mis de côté n'a pas de questions : le champ reste absent
          // plutôt que de porter un tableau vide, qui se lirait « zéro question
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
