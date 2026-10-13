import "dotenv/config";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Langue } from "@/lib/db/types";

/**
 * La configuration de la banque d'assets.
 *
 * Le code de génération vit dans le dépôt ; les fichiers produits, non — ils se
 * régénèrent, et n'ont rien à faire dans un historique de code. La racine de
 * sortie est donc hors du dépôt, réglable par `ASSETS_OUT_DIR`, avec pour défaut
 * le dossier de contenu voisin.
 */

/** Racine des fichiers produits. Hors du dépôt ; réglable. */
export const ASSETS_OUT_DIR = process.env.ASSETS_OUT_DIR
  ? path.resolve(process.env.ASSETS_OUT_DIR)
  : path.resolve(process.cwd(), "..", "contenu", "commun", "assets");

/** L'application visée par Playwright. Le serveur dev tourne sur ce port. */
export const BASE_URL = process.env.ASSETS_BASE_URL ?? "http://localhost:3000";

export type Viewport = "mobile" | "bureau";

type ReglageDeViewport = { width: number; height: number; deviceScaleFactor: number };

/**
 * Les deux formats de capture. Thème clair uniquement — il est de toute façon
 * verrouillé côté application, il n'y a pas de variante sombre à écarter.
 */
export const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 3 },
  bureau: { width: 1440, height: 900, deviceScaleFactor: 2 },
} as const satisfies Record<Viewport, ReglageDeViewport>;

/**
 * Le chemin d'un fichier produit : `<out>/<viewport>/<ecran>/<sujet>.<ext>`.
 *
 * Sans sujet, l'écran nomme lui-même le fichier — pour les écrans qui n'ont pas
 * de déclinaison par sujet (la page des offres, l'email de rappel). Une capture
 * de l'interface anglaise prend `.en` avant l'extension, à côté de la française
 * sans l'écraser.
 */
export function cheminDeSortie(opts: {
  viewport: Viewport;
  ecran: string;
  sujet?: string;
  langue?: Langue;
  ext: "png" | "mp4";
}): string {
  const suffixe = opts.langue === "EN" ? ".en" : "";
  const nom = `${opts.sujet ?? opts.ecran}${suffixe}.${opts.ext}`;

  return path.join(ASSETS_OUT_DIR, opts.viewport, opts.ecran, nom);
}

/** Le chemin d'un fichier relatif à la racine de sortie, en séparateurs POSIX. */
export function cheminRelatif(fichierAbsolu: string): string {
  return path.relative(ASSETS_OUT_DIR, fichierAbsolu).split(path.sep).join("/");
}

/** Crée le dossier parent d'un fichier s'il manque. */
export function assurerLeDossier(fichier: string): void {
  mkdirSync(path.dirname(fichier), { recursive: true });
}
