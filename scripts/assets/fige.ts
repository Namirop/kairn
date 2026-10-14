import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { DepotEvalue } from "@/scripts/evaluation/execution";

/**
 * Le figé d'assets : les vraies sorties du pipeline pour les sujets de démo,
 * pour que le seed et les captures ne repayent jamais.
 *
 * Contrairement au figé du banc, il est sans perte pour le seed : il garde
 * `estVraie` (sinon le VRAI/FAUX retombe en question ouverte) et l'ordre des
 * options. Versionné : il rend le compte de démo reproductible hors ligne.
 */

const DOSSIER = path.join(import.meta.dirname, "fige");
const CHEMIN = path.join(DOSSIER, "demo.json");

const FORMATS = ["MCQ", "CLOZE", "TRUE_FALSE", "SHORT_ANSWER", "CODE", "EXPLAIN"] as const;
const FACETS = ["RECOGNITION", "MECHANISM", "BOUNDARY", "APPLICATION"] as const;

const variant = z.object({
  format: z.enum(FORMATS),
  facet: z.enum(FACETS),
  question: z.string(),
  answerKey: z.string(),
  /** Le VRAI/FAUX : ce que la question affirme est-il vrai. Null hors de ce format. */
  estVraie: z.boolean().nullable(),
  options: z.array(z.string()).nullable(),
  correctIndex: z.number().int().nullable(),
  cloze: z
    .object({
      sentence: z.string(),
      accepted: z.array(z.string()),
      leurres: z.array(z.string()),
    })
    .nullable(),
});

const concept = z.object({
  concept: z.string(),
  tags: z.array(z.string()),
  uncertain: z.boolean(),
  /** Douteux : aucune question n'a été demandée pour ce concept. */
  misDeCote: z.boolean().optional(),
  variants: z.array(variant),
});

const depot = z.object({
  cle: z.string(),
  titre: z.string(),
  nom: z.string(),
  texte: z.string(),
  estImage: z.boolean(),
  lecture: z.object({ langue: z.string().nullable(), exploitable: z.boolean() }).nullish(),
  nature: z.string().nullish(),
  rejet: z.string().nullable(),
  /** Le motif d'un échec d'extraction, s'il y en a eu un. */
  echec: z.string().nullish(),
  concepts: z.array(concept),
});

const figeDAssets = z.object({
  genereLe: z.string(),
  modele: z.string(),
  depots: z.array(depot),
});

export type VariantDAssets = z.infer<typeof variant>;
export type ConceptDAssets = z.infer<typeof concept>;
export type DepotDAssets = z.infer<typeof depot>;

/** Réduit un dépôt évalué du banc à ce que le seed et les captures consomment. */
export function depuisDepotEvalue(
  evalue: DepotEvalue,
  sujet: { cle: string; titre: string; estImage: boolean },
): DepotDAssets {
  return {
    cle: sujet.cle,
    titre: sujet.titre,
    nom: evalue.nom,
    texte: evalue.texte,
    estImage: sujet.estImage,
    lecture: evalue.lecture ?? null,
    nature: evalue.nature ?? null,
    rejet: evalue.rejet,
    echec: evalue.echec?.motif ?? null,
    concepts: evalue.concepts.map((entree) => ({
      concept: entree.concept.concept,
      tags: entree.concept.tags,
      uncertain: entree.concept.uncertain,
      misDeCote: entree.misDeCote,
      variants: entree.variants.map((v) => ({
        format: v.format,
        facet: v.facet,
        question: v.question,
        answerKey: v.answerKey,
        estVraie: v.estVraie,
        options: v.options,
        correctIndex: v.correctIndex,
        cloze: v.cloze,
      })),
    })),
  };
}

export function lireFigeDAssets(): DepotDAssets[] {
  if (!existsSync(CHEMIN)) return [];

  const brut: unknown = JSON.parse(readFileSync(CHEMIN, "utf8"));
  const lu = figeDAssets.safeParse(brut);

  if (!lu.success) {
    throw new Error(`Figé d'assets illisible (${CHEMIN}) : ${lu.error.message}`);
  }

  return lu.data.depots;
}

export function ecrireFigeDAssets(depots: DepotDAssets[], modele: string): string {
  mkdirSync(DOSSIER, { recursive: true });

  const contenu = { genereLe: new Date().toISOString(), modele, depots };

  writeFileSync(CHEMIN, `${JSON.stringify(contenu, null, 2)}\n`);

  return CHEMIN;
}

/** Combien de variantes de chaque format le figé porte, tous dépôts confondus. */
export function couvertureDesFormats(depots: DepotDAssets[]): Record<string, number> {
  const compte: Record<string, number> = {};

  for (const d of depots) {
    for (const c of d.concepts) {
      for (const v of c.variants) {
        compte[v.format] = (compte[v.format] ?? 0) + 1;
      }
    }
  }

  return compte;
}
