import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Browser, Page } from "@playwright/test";
import {
  assurerLeDossier,
  BASE_URL,
  cheminDeSortie,
  cheminRelatif,
  VIEWPORTS,
} from "@/scripts/assets/config";
import { ajouterAuManifeste } from "@/scripts/assets/manifest";
import { cookiesDeSession } from "@/scripts/assets/session";

/**
 * L'enregistrement vidéo, en viewport mobile, avec un indicateur de toucher
 * injecté dans la page. Playwright enregistre en webm ; ffmpeg coupe les temps
 * d'attente d'après des repères posés par le script, et exporte en MP4.
 */

const DOSSIER_WEBM = path.join(tmpdir(), "kairn-webm");

/**
 * Un halo lichen à chaque appui — l'indicateur de toucher, sur toutes les pages.
 *
 * Le script tourne au tout début du document : `document.documentElement` peut
 * être nul à cet instant. On enregistre donc les écouteurs tout de suite (ils
 * n'ont besoin que de `window`) et on ne touche au DOM qu'au moment de l'appui,
 * quand le corps existe.
 */
const OVERLAY_TOUCH = `
(function () {
  var CSS = ".kairn-touch{position:fixed;z-index:2147483647;width:52px;height:52px;border-radius:50%;background:rgba(122,139,79,0.28);border:2px solid rgba(122,139,79,0.75);pointer-events:none;transition:opacity .45s ease-out,transform .45s ease-out;}";
  function poserLeStyle() {
    if (document.getElementById("kairn-touch-style")) return;
    var s = document.createElement("style");
    s.id = "kairn-touch-style";
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  function halo(x, y) {
    poserLeStyle();
    var point = document.createElement("div");
    point.className = "kairn-touch";
    point.style.left = (x - 26) + "px";
    point.style.top = (y - 26) + "px";
    (document.body || document.documentElement).appendChild(point);
    requestAnimationFrame(function () { point.style.opacity = "0"; point.style.transform = "scale(1.7)"; });
    setTimeout(function () { point.remove(); }, 470);
  }
  window.addEventListener("pointerdown", function (e) { halo(e.clientX, e.clientY); }, true);
  window.addEventListener("touchstart", function (e) { var t = e.touches[0]; if (t) halo(t.clientX, t.clientY); }, true);
})();
`;

/** Une plage à retirer du montage, en millisecondes depuis le début de la vidéo. */
export type Coupure = { debutMs: number; finMs: number };

/** Déroule la scène ; `marquer` rend l'instant courant, pour bâtir les coupures. */
export type Deroule = (page: Page, marquer: (label: string) => number) => Promise<Coupure[]>;

export async function enregistrer(
  browser: Browser,
  opts: { nom: string; connecte: boolean; deroule: Deroule },
): Promise<string> {
  mkdirSync(DOSSIER_WEBM, { recursive: true });

  const mobile = VIEWPORTS.mobile;
  const ctx = await browser.newContext({
    viewport: { width: mobile.width, height: mobile.height },
    deviceScaleFactor: 2,
    colorScheme: "light",
    hasTouch: true,
    isMobile: true,
    baseURL: BASE_URL,
    // La taille doit égaler le viewport, sinon Playwright pose la page dans un
    // coin et remplit le reste de gris. On agrandit ensuite proprement à ffmpeg.
    recordVideo: { dir: DOSSIER_WEBM, size: { width: mobile.width, height: mobile.height } },
  });

  if (opts.connecte) await ctx.addCookies(await cookiesDeSession());
  await ctx.addInitScript({ content: OVERLAY_TOUCH });

  const page = await ctx.newPage();
  const depart = Date.now();
  const coupures = await opts.deroule(page, () => Date.now() - depart);
  const video = page.video();

  await ctx.close();

  const webm = video ? await video.path() : null;
  if (!webm) throw new Error("Aucune vidéo n'a été enregistrée.");

  const sortie = cheminDeSortie({ viewport: "mobile", ecran: opts.nom, ext: "mp4" });
  assurerLeDossier(sortie);
  monterLaVideo(webm, coupures, sortie);

  const relatif = cheminRelatif(sortie);
  ajouterAuManifeste({
    fichier: relatif,
    type: "video",
    ecran: opts.nom,
    sujet: null,
    viewport: "mobile",
    format: null,
    depotSource: null,
    date: new Date().toISOString(),
  });

  return relatif;
}

/** Agrandissement propre du viewport mobile (390×844) au double, pour la sortie. */
const ECHELLE = "scale=780:1688:flags=lanczos";
const SORTIE_H264 = ["-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];

function monterLaVideo(webm: string, coupures: Coupure[], sortie: string): void {
  const args =
    coupures.length > 0
      ? ["-i", webm, "-filter_complex", filtreDeCoupures(coupures), "-map", "[out]", ...SORTIE_H264]
      : ["-i", webm, "-vf", ECHELLE, ...SORTIE_H264];

  const resultat = spawnSync("ffmpeg", ["-y", ...args, sortie], { stdio: "ignore" });

  if (resultat.status !== 0) throw new Error(`ffmpeg a échoué pour ${sortie}`);
}

/** Garde tout sauf les plages de `coupures`, recollées bout à bout, puis agrandit. */
function filtreDeCoupures(coupures: Coupure[]): string {
  const triees = [...coupures].sort((a, b) => a.debutMs - b.debutMs);
  const gardes: { a: number; b?: number }[] = [];
  let curseur = 0;

  for (const coupure of triees) {
    gardes.push({ a: curseur, b: coupure.debutMs / 1000 });
    curseur = coupure.finMs / 1000;
  }
  gardes.push({ a: curseur });

  const segments = gardes.map((garde, index) =>
    garde.b === undefined
      ? `[0:v]trim=${garde.a.toFixed(3)},setpts=PTS-STARTPTS[v${index}]`
      : `[0:v]trim=${garde.a.toFixed(3)}:${garde.b.toFixed(3)},setpts=PTS-STARTPTS[v${index}]`,
  );
  const etiquettes = gardes.map((_, index) => `[v${index}]`).join("");

  return `${segments.join(";")};${etiquettes}concat=n=${gardes.length}:v=1,${ECHELLE}[out]`;
}
