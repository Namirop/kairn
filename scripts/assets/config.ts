import "dotenv/config";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Langue } from "@/lib/db/types";

/** La configuration de la banque d'assets. */

/**
 * Racine des fichiers produits, hors du dépôt : ils se régénèrent et n'ont rien
 * à faire dans l'historique. Par défaut, le dossier de contenu voisin.
 */
export const DOSSIER_DE_SORTIE = process.env.ASSETS_OUT_DIR
  ? path.resolve(process.env.ASSETS_OUT_DIR)
  : path.resolve(process.cwd(), "..", "contenu", "commun", "assets");

/** L'application visée par Playwright. */
export const URL_DE_L_APPLICATION = process.env.ASSETS_BASE_URL ?? "http://localhost:3000";

export type Viewport = "mobile" | "bureau";

type ReglageDeViewport = { width: number; height: number; deviceScaleFactor: number };

/** Les deux formats de capture, en thème clair : l'application n'en a pas d'autre. */
export const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 3 },
  bureau: { width: 1440, height: 900, deviceScaleFactor: 2 },
} as const satisfies Record<Viewport, ReglageDeViewport>;

/**
 * Le chemin d'un fichier produit : `<out>/<viewport>/<ecran>/<sujet>.<ext>`.
 *
 * Sans sujet, l'écran nomme le fichier (écrans sans déclinaison par sujet). Une
 * capture anglaise prend `.en` avant l'extension, à côté de la française.
 */
export function cheminDeSortie(options: {
  viewport: Viewport;
  ecran: string;
  sujet?: string;
  langue?: Langue;
  ext: "png" | "mp4";
}): string {
  const suffixe = options.langue === "EN" ? ".en" : "";
  const nom = `${options.sujet ?? options.ecran}${suffixe}.${options.ext}`;

  return path.join(DOSSIER_DE_SORTIE, options.viewport, options.ecran, nom);
}

/** Le chemin d'un fichier relatif à la racine de sortie, en séparateurs POSIX. */
export function cheminRelatif(fichierAbsolu: string): string {
  return path.relative(DOSSIER_DE_SORTIE, fichierAbsolu).split(path.sep).join("/");
}

/** Crée le dossier parent d'un fichier s'il manque. */
export function assurerLeDossier(fichier: string): void {
  mkdirSync(path.dirname(fichier), { recursive: true });
}
