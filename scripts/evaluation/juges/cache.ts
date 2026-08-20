import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { CouvertureAttendu } from "../attendus";
import type { VerdictDoublon } from "./doublon";
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

function cheminDuCache(cheminFige: string): string {
  return join(DOSSIER, basename(cheminFige));
}

export function chargerCache(cheminFige: string): CacheDeMesure {
  const chemin = cheminDuCache(cheminFige);
  if (!existsSync(chemin)) {
    return { fige: basename(cheminFige), depots: {} };
  }
  return JSON.parse(readFileSync(chemin, "utf8")) as CacheDeMesure;
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
