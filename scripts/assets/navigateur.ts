import "dotenv/config";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { Langue } from "@/lib/db/types";
import {
  assurerLeDossier,
  URL_DE_L_APPLICATION,
  cheminDeSortie,
  cheminRelatif,
  VIEWPORTS,
  type Viewport,
} from "@/scripts/assets/config";
import { ajouterAuManifeste } from "@/scripts/assets/manifeste";
import { cookiesDeSession } from "@/scripts/assets/session";

/** Le pilotage du navigateur pour les captures. */

/**
 * Le Chromium de Playwright, ou un navigateur installé nommé par
 * `ASSETS_NAVIGATEUR` (`chrome`, `msedge`) quand celui de Playwright manque.
 */
export async function ouvrirLeNavigateur(): Promise<Browser> {
  const canal = process.env.ASSETS_NAVIGATEUR;

  return chromium.launch(canal ? { channel: canal } : {});
}

/** Un contexte réglé pour un viewport, connecté au compte de démo ou non. */
export async function contexte(
  navigateur: Browser,
  viewport: Viewport,
  connecte: boolean,
): Promise<BrowserContext> {
  const reglage = VIEWPORTS[viewport];
  const ctx = await navigateur.newContext({
    viewport: { width: reglage.width, height: reglage.height },
    deviceScaleFactor: reglage.deviceScaleFactor,
    colorScheme: "light",
    hasTouch: viewport === "mobile",
    isMobile: viewport === "mobile",
    baseURL: URL_DE_L_APPLICATION,
  });

  if (connecte) await ctx.addCookies(await cookiesDeSession());

  return ctx;
}

/** Sans cette attente, une capture prendrait la police de repli de `display: swap`. */
export async function attendrePolices(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

export type OptionsDeTir = {
  viewport: Viewport;
  ecran: string;
  sujet?: string;
  format?: string;
  depotSource?: string;
  /** La langue de l'interface ; le français par défaut. */
  langue?: Langue;
  /** Un sélecteur CSS pour ne tirer qu'un élément (recadrage serré). */
  selecteur?: string;
  /** Toute la page plutôt que la seule fenêtre visible. */
  pleinePage?: boolean;
};

/** Tire une capture, l'écrit sur disque, et pose son entrée au manifeste. */
export async function tirer(page: Page, options: OptionsDeTir): Promise<string> {
  await attendrePolices(page);

  const fichier = cheminDeSortie({
    viewport: options.viewport,
    ecran: options.ecran,
    sujet: options.sujet,
    langue: options.langue,
    ext: "png",
  });
  assurerLeDossier(fichier);

  if (options.selecteur) {
    await page.locator(options.selecteur).first().screenshot({ path: fichier });
  } else {
    await page.screenshot({ path: fichier, fullPage: options.pleinePage ?? false });
  }

  ajouterAuManifeste({
    fichier: cheminRelatif(fichier),
    type: "capture",
    ecran: options.ecran,
    sujet: options.sujet ?? null,
    viewport: options.viewport,
    format: options.format ?? null,
    depotSource: options.depotSource ?? null,
    langue: options.langue ?? "FR",
    date: new Date().toISOString(),
  });

  return cheminRelatif(fichier);
}

/** Va à un chemin de l'application et attend que le réseau se calme. */
export async function aller(page: Page, chemin: string): Promise<void> {
  await page.goto(chemin, { waitUntil: "networkidle" });
}
