/**
 * Questions à l'appareil sur l'installation ; les décisions sont dans
 * `use-installation`. Tout passe par `Reflect` : ces interfaces n'existent pas
 * partout, et un `as` affirmerait ce qu'on vérifie.
 */

/**
 * Cette fenêtre-ci est-elle lancée depuis l'écran d'accueil ? `standalone` sert
 * encore sur iPhone, `android-app://` pour une enveloppe native.
 */
export function fenetreInstallee(): boolean {
  const modes = ["standalone", "minimal-ui", "fullscreen", "window-controls-overlay"];

  if (modes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)) return true;
  if (Reflect.get(window.navigator, "standalone") === true) return true;

  return document.referrer.startsWith("android-app://");
}

/**
 * Posée sur l'appareil, même vue d'un onglet ordinaire ? `getInstalledRelatedApps`
 * (Chrome seulement) ne voit que `related_applications` du manifeste, d'où
 * l'entrée qui y désigne Kairn elle-même.
 */
export async function applicationDejaPosee(): Promise<boolean> {
  if (fenetreInstallee()) return true;

  const lecteur: unknown = Reflect.get(window.navigator, "getInstalledRelatedApps");

  if (typeof lecteur !== "function") return false;

  try {
    const liees: unknown = await Reflect.apply(lecteur, window.navigator, []);

    return Array.isArray(liees) && liees.length > 0;
  } catch {
    // Refusé hors contexte sécurisé : on ne sait pas, donc on propose.
    return false;
  }
}

/**
 * Le geste à décrire quand le navigateur n'en déclenche aucun : aucun navigateur
 * d'iOS n'émet `beforeinstallprompt` (tous sont WebKit), Safari sur Mac installe
 * depuis son menu. L'iPad s'annonce « Macintosh » : seuls ses points de contact
 * le distinguent.
 */
export type GesteManuel = "partage" | "dock";

export function gesteManuel(): GesteManuel | null {
  const agent = window.navigator.userAgent;
  const tactile = window.navigator.maxTouchPoints > 1;

  if (/iPhone|iPad|iPod/.test(agent)) return "partage";
  if (/Macintosh/.test(agent) && tactile) return "partage";
  if (/Macintosh/.test(agent) && estSafari(agent)) return "dock";

  return null;
}

/** Chrome, Edge et Opera portent aussi « Safari » dans leur agent. */
function estSafari(agent: string): boolean {
  if (!/Safari/.test(agent)) return false;

  return !/Chrome|Chromium|Edg|OPR|Firefox/.test(agent);
}
