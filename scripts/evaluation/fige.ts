import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
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

export function ecrireFige(evaluations: DepotEvalue[], modele: string, emisA: Date): string {
  const fige: CorpusFige = {
    emisA: emisA.toISOString(),
    modele,
    depots: evaluations.map((evaluation) => ({
      nom: evaluation.nom,
      texte: evaluation.texte,
      lecture: evaluation.lecture,
      rejet: evaluation.rejet,
      concepts: evaluation.concepts.map((evalue) => evalue.concept),
    })),
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
