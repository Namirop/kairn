import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ASSETS_OUT_DIR, assurerLeDossier } from "@/scripts/assets/config";

/**
 * Le manifeste, seul fichier versionné du dossier de sortie (PNG et MP4 se
 * régénèrent) : il décrit chaque fichier produit pour qu'on l'interroge sans
 * deviner d'après les noms.
 */

const entree = z.object({
  /** Chemin relatif à la racine de sortie, en séparateurs POSIX. */
  fichier: z.string().min(1),
  type: z.enum(["capture", "video"]),
  ecran: z.string().min(1),
  /** Le sujet du dépôt, quand l'écran en décline un. */
  sujet: z.string().nullable(),
  viewport: z.enum(["mobile", "bureau"]).nullable(),
  /** Le format de question illustré, quand l'écran en montre un. */
  format: z.string().nullable(),
  /** Le nom du dépôt source dans le figé d'assets, quand il y en a un. */
  depotSource: z.string().nullable(),
  /** La langue de l'interface capturée ; absente des entrées anciennes, toutes françaises. */
  langue: z.enum(["FR", "EN"]).default("FR"),
  /** Instant de génération, en ISO 8601. */
  date: z.string().min(1),
});

export type EntreeDeManifeste = z.infer<typeof entree>;

const manifeste = z.object({ genereLe: z.string(), entrees: z.array(entree) });

const CHEMIN = path.join(ASSETS_OUT_DIR, "manifest.json");

export function lireManifeste(): EntreeDeManifeste[] {
  if (!existsSync(CHEMIN)) return [];

  const brut: unknown = JSON.parse(readFileSync(CHEMIN, "utf8"));
  const lu = manifeste.safeParse(brut);

  return lu.success ? lu.data.entrees : [];
}

export function ecrireManifeste(entrees: EntreeDeManifeste[]): void {
  assurerLeDossier(CHEMIN);

  const trie = [...entrees].sort((a, b) => a.fichier.localeCompare(b.fichier));
  const contenu = { genereLe: new Date().toISOString(), entrees: trie };

  writeFileSync(CHEMIN, `${JSON.stringify(contenu, null, 2)}\n`);
}

/**
 * Ajoute une entrée, ou remplace celle du même fichier, puis réécrit le
 * manifeste. La clé est le chemin : rejouer une capture ne crée pas de doublon.
 */
export function ajouterAuManifeste(nouvelle: z.input<typeof entree>): void {
  const entrees = lireManifeste().filter((e) => e.fichier !== nouvelle.fichier);

  entrees.push(entree.parse(nouvelle));
  ecrireManifeste(entrees);
}
