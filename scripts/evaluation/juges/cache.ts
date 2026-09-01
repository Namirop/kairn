import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { z } from "zod";
import type { CouvertureAttendu } from "../attendus";
import { SENS_DOUBLON, type VerdictDoublon } from "./doublon";
import type { VerdictFidelite } from "./fidelite";
import type { VerdictInvention, VerdictManque } from "./residu";

/**
 * Cache incrémental des verdicts d'une passe de mesure.
 *
 * Un juge qui a rendu un verdict n'a plus à le repasser. Le cache est écrit
 * après chaque appel réussi ; la relance repart d'ici au lieu de tout brûler.
 * Même principe que la complétion des figés après la panne de 27, à la
 * granularité d'un item juge — la panne de plafond a montré que sans cette
 * granularité, une mesure interrompue à mi-chemin coûte deux fois.
 *
 * Un fichier par figé, sous `scripts/evaluation/verdicts/`. La présence d'un
 * champ signifie « terminé » ; son absence, « à faire ». Écriture atomique
 * (temp + rename) pour qu'un `Ctrl-C` en plein milieu ne corrompe rien.
 *
 * ⚠️ Si tu modifies le prompt d'un juge, supprime le fichier de cache
 * correspondant : les verdicts d'hier n'ont pas été rendus par le juge
 * d'aujourd'hui.
 */

const DOSSIER = join(import.meta.dirname, "..", "verdicts");

export type CacheDeDepot = {
  doublons?: VerdictDoublon[];
  residu?: { manques: VerdictManque[]; inventions: VerdictInvention[] };
  fidelite?: Record<string, VerdictFidelite[]>;
  attendus?: CouvertureAttendu[];
};

export type CacheDeMesure = {
  fige: string;
  depots: Record<string, CacheDeDepot>;
};

/**
 * Le cache est relu, donc il est validé.
 *
 * Il est écrit par ce module lui-même, ce qui rend la validation inutile en
 * marche normale — mais un cache se garde entre deux versions du banc, et c'est
 * précisément là qu'il ment : un verdict d'une forme antérieure passerait sans
 * bruit et casserait quinze appels plus loin, sur une ligne qui n'y est pour
 * rien. Le schéma le refuse tout de suite et nomme le fichier à supprimer.
 *
 * C'est aussi ce que le CLAUDE.md demande : un `JSON.parse` rend `unknown`, et
 * ce qui le transforme en type est un schéma, jamais une assertion.
 */
const motive = z.object({ motif: z.string() });

const verdictDoublon = z.object({
  independants: z.boolean().nullable(),
  sens: z.enum(SENS_DOUBLON).nullable(),
  questionSurA: z.string().nullable(),
  questionSurB: z.string().nullable(),
});

const cacheDeDepot = z.object({
  doublons: z.array(verdictDoublon).optional(),
  residu: z
    .object({
      manques: z.array(motive.extend({ retenir: z.boolean().nullable() })),
      inventions: z.array(motive.extend({ soutenu: z.boolean().nullable() })),
    })
    .optional(),
  fidelite: z
    .record(z.string(), z.array(motive.extend({ juste: z.boolean().nullable() })))
    .optional(),
  attendus: z
    .array(
      z.object({
        attendu: z.string(),
        candidats: z.array(z.object({ concept: z.string(), proximite: z.number() })),
        couvertParProximite: z.boolean(),
        verdict: motive.extend({ couvert: z.boolean().nullable() }).optional(),
      }),
    )
    .optional(),
});

const cacheDeMesure = z.object({
  fige: z.string(),
  depots: z.record(z.string(), cacheDeDepot),
});

function cheminDuCache(cheminFige: string): string {
  return join(DOSSIER, basename(cheminFige));
}

export function chargerCache(cheminFige: string): CacheDeMesure {
  const chemin = cheminDuCache(cheminFige);
  if (!existsSync(chemin)) {
    return { fige: basename(cheminFige), depots: {} };
  }
  const lu = cacheDeMesure.safeParse(JSON.parse(readFileSync(chemin, "utf8")));

  if (!lu.success) {
    throw new Error(
      `Cache illisible : ${chemin}
Il a probablement été écrit par une version antérieure du banc. Supprime-le et relance.`,
      { cause: lu.error },
    );
  }

  return lu.data;
}

/**
 * Écriture atomique. Un `Ctrl-C` en pleine écriture ne laisse jamais un cache
 * tronqué — le rename est atomique sur les systèmes de fichiers usuels.
 */
export function sauverCache(cache: CacheDeMesure, cheminFige: string): void {
  const chemin = cheminDuCache(cheminFige);
  const temp = `${chemin}.tmp`;
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(temp, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  renameSync(temp, chemin);
}

/** Cache d'un dépôt, créé au vol si absent. Le retour est mutable — les écritures suivantes le voient. */
export function cacheDuDepot(cache: CacheDeMesure, nom: string): CacheDeDepot {
  cache.depots[nom] ??= {};
  return cache.depots[nom];
}

/** Combien d'items sont déjà en cache, par juge. Sert au plan chiffré : « X en cache, Y à faire ». */
export function compterEnCache(cache: CacheDeMesure): {
  doublon: number;
  residu: number;
  fidelite: number;
  attendus: number;
} {
  let doublon = 0;
  let residu = 0;
  let fidelite = 0;
  let attendus = 0;
  for (const depot of Object.values(cache.depots)) {
    if (depot.doublons !== undefined) doublon += 1;
    if (depot.residu !== undefined) residu += 1;
    if (depot.fidelite !== undefined) fidelite += Object.keys(depot.fidelite).length;
    if (depot.attendus !== undefined) attendus += 1;
  }
  return { doublon, residu, fidelite, attendus };
}
