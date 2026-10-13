import "dotenv/config";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { Langue } from "@/lib/db/types";
import {
  assurerLeDossier,
  BASE_URL,
  cheminDeSortie,
  cheminRelatif,
  VIEWPORTS,
  type Viewport,
} from "@/scripts/assets/config";
import { ajouterAuManifeste } from "@/scripts/assets/manifest";
import { cookiesDeSession } from "@/scripts/assets/session";

/**
 * Le pilotage du navigateur pour les captures.
 *
 * Thème clair forcé, échelle rétine selon le viewport, et on attend le chargement
 * des polices avant chaque tir — sans quoi une capture prendrait le repli de
 * `display: swap` au lieu de Satoshi ou Bricolage.
 */

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
  browser: Browser,
  viewport: Viewport,
  connecte: boolean,
): Promise<BrowserContext> {
  const reglage = VIEWPORTS[viewport];
  const ctx = await browser.newContext({
    viewport: { width: reglage.width, height: reglage.height },
    deviceScaleFactor: reglage.deviceScaleFactor,
    colorScheme: "light",
    hasTouch: viewport === "mobile",
    isMobile: viewport === "mobile",
    baseURL: BASE_URL,
  });

  if (connecte) await ctx.addCookies(await cookiesDeSession());

  return ctx;
}

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
export async function tirer(page: Page, opts: OptionsDeTir): Promise<string> {
  await attendrePolices(page);

  const fichier = cheminDeSortie({
    viewport: opts.viewport,
    ecran: opts.ecran,
    sujet: opts.sujet,
    langue: opts.langue,
    ext: "png",
  });
  assurerLeDossier(fichier);

  if (opts.selecteur) {
    await page.locator(opts.selecteur).first().screenshot({ path: fichier });
  } else {
    await page.screenshot({ path: fichier, fullPage: opts.pleinePage ?? false });
  }

  ajouterAuManifeste({
    fichier: cheminRelatif(fichier),
    type: "capture",
    ecran: opts.ecran,
    sujet: opts.sujet ?? null,
    viewport: opts.viewport,
    format: opts.format ?? null,
    depotSource: opts.depotSource ?? null,
    langue: opts.langue ?? "FR",
    date: new Date().toISOString(),
  });

  return cheminRelatif(fichier);
}

/** Va à un chemin de l'application et attend que le réseau se calme. */
export async function aller(page: Page, chemin: string): Promise<void> {
  await page.goto(chemin, { waitUntil: "networkidle" });
}
