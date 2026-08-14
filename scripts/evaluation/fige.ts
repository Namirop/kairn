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
      concepts: z.array(
        z.object({
          concept: z.string(),
          tags: z.array(z.string()),
          uncertain: z.boolean(),
        }),
      ),
    }),
  ),
});

export type CorpusFige = z.infer<typeof figeSchema>;
export type DepotFige = CorpusFige["depots"][number];

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
        concepts: evaluation.concepts.map((evalue) => evalue.concept),
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
