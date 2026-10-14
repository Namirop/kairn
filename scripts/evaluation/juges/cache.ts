import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { z } from "zod";
import type { CouvertureAttendu } from "../attendus";
import { SENS_DOUBLON, type VerdictDoublon } from "./doublon";
import type { VerdictFidelite } from "./fidelite";
import type { VerdictInvention, VerdictManque } from "./residu";

/**
 * Cache incrémental des verdicts d'une passe de mesure, écrit après chaque
 * appel réussi : une mesure interrompue reprend sans repayer ce qui est rendu.
 *
 * Un fichier par figé, sous `scripts/evaluation/verdicts/`. Un champ présent
 * signifie « terminé », absent « à faire ».
 *
 * Le prompt d'un juge change : supprime le cache correspondant, ses verdicts
 * viennent de l'ancien juge.
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
 * Le cache relu est validé : il survit aux versions du banc, et un verdict de
 * forme antérieure casserait plus loin, sur une ligne qui n'y est pour rien.
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

/** Écriture atomique (temp puis rename) : un `Ctrl-C` ne laisse pas de cache tronqué. */
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
