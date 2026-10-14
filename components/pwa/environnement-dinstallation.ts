/**
 * Ce que le navigateur courant sait de l'installation : des questions à
 * l'appareil, aucune décision (elles se prennent dans `use-installation`).
 *
 * Tout se lit par `Reflect` : ces interfaces n'existent que sur certains
 * navigateurs, et un `as` affirmerait ce qu'on est en train de vérifier.
 */

/**
 * L'application tourne-t-elle dans cette fenêtre-ci depuis l'écran d'accueil ?
 *
 * Les quatre `display-mode` qu'un manifeste peut demander ou qu'un navigateur
 * impose (`window-controls-overlay` sur bureau), `navigator.standalone` qui sert
 * encore sur iPhone, et `android-app://` pour une enveloppe native.
 */
export function fenetreInstallee(): boolean {
  const modes = ["standalone", "minimal-ui", "fullscreen", "window-controls-overlay"];

  if (modes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)) return true;
  if (Reflect.get(window.navigator, "standalone") === true) return true;

  return document.referrer.startsWith("android-app://");
}

/**
 * L'application est-elle posée sur cet appareil, même vue depuis un onglet
 * ordinaire ? `display-mode` ne renseigne que sur la fenêtre courante.
 *
 * `getInstalledRelatedApps` ne répond que sur ce que le manifeste déclare dans
 * `related_applications` — d'où l'entrée qui y désigne Kairn elle-même. Elle
 * n'existe que sur Chrome et dérivés ; ailleurs, on ne sait pas, et on retombe
 * sur les signaux de fenêtre.
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
 * Le geste à décrire quand le navigateur n'en déclenche aucun.
 *
 * Sur iPhone et iPad, le menu de partage : aucun navigateur d'iOS n'émet
 * `beforeinstallprompt`, Chrome compris (tous tournent sur WebKit). Sur Mac,
 * Safari installe depuis son menu Fichier ; les autres navigateurs de bureau
 * déclenchent l'événement eux-mêmes.
 *
 * L'iPad annonce « Macintosh » dans son agent depuis iPadOS 13 : seul le nombre
 * de points de contact le distingue d'un Mac.
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

/**
 * Safari, et lui seul : Chrome, Edge et Opera portent aussi « Safari » dans leur
 * agent, on les écarte.
 */
function estSafari(agent: string): boolean {
  if (!/Safari/.test(agent)) return false;

  return !/Chrome|Chromium|Edg|OPR|Firefox/.test(agent);
}
