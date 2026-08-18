/**
 * Ce que le navigateur courant sait de l'installation. Rien que des questions
 * posées à l'appareil, et aucune décision : le choix de ce qu'on affiche se
 * prend dans `use-installation`.
 *
 * Tout ici se lit par `Reflect` plutôt que par une assertion de type. Ce sont
 * des interfaces que TypeScript ne connaît pas — parce qu'elles n'existent que
 * sur certains navigateurs — et forcer leur présence par un `as` reviendrait à
 * affirmer au compilateur ce qu'on est précisément en train de vérifier.
 */

/**
 * L'application tourne-t-elle **dans cette fenêtre-ci** depuis l'écran
 * d'accueil ?
 *
 * Quatre signaux parce qu'il y a quatre implémentations. `standalone` est le cas
 * ordinaire ; `minimal-ui` et `fullscreen` sont les autres modes qu'un manifeste
 * peut demander et qu'un navigateur peut imposer ; `window-controls-overlay` est
 * ce que donne une installation sur un ordinateur de bureau. `navigator.standalone`
 * est ce que Safari a fait avant que la requête de média existe, et continue de
 * servir sur iPhone. Et une navigation venue d'`android-app://` signale une
 * enveloppe native.
 */
export function fenetreInstallee(): boolean {
  const modes = ["standalone", "minimal-ui", "fullscreen", "window-controls-overlay"];

  if (modes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)) return true;
  if (Reflect.get(window.navigator, "standalone") === true) return true;

  return document.referrer.startsWith("android-app://");
}

/**
 * L'application est-elle posée sur cet appareil, **même si on la regarde depuis
 * un onglet ordinaire** ?
 *
 * C'est la question que `display-mode` ne sait pas résoudre : elle ne renseigne
 * que sur la fenêtre courante. Quelqu'un qui a installé Kairn puis rouvre le
 * site dans son navigateur passait pour un nouveau venu, et se voyait proposer
 * une seconde installation de ce qu'il avait déjà.
 *
 * `getInstalledRelatedApps` répond, mais seulement sur ce que le manifeste
 * déclare dans `related_applications` — d'où l'entrée qui y désigne Kairn
 * elle-même. Elle n'existe que sur Chrome et ses dérivés ; ailleurs, l'absence
 * de réponse n'est pas une réponse négative, c'est une ignorance, et on retombe
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
    // L'appel est refusé hors contexte sécurisé, et le refus n'apprend rien sur
    // l'installation. On ne sait pas, donc on propose.
    return false;
  }
}

/**
 * Le geste qu'il faut décrire quand le navigateur n'en déclenche aucun.
 *
 * Deux familles, et elles ne se ressemblent pas. **Sur iPhone et iPad**,
 * l'installation passe par le menu de partage — aucun navigateur d'iOS n'émet
 * `beforeinstallprompt`, y compris Chrome, parce qu'ils tournent tous sur le
 * moteur de Safari. **Sur un Mac**, Safari installe depuis son menu Fichier
 * depuis Sonoma ; les autres navigateurs de bureau qui savent installer le
 * déclenchent eux-mêmes et n'arrivent pas jusqu'ici.
 *
 * L'iPad demande le second test : depuis iPadOS 13, il annonce « Macintosh »
 * dans sa chaîne d'agent. Sans le nombre de points de contact, tous les iPads
 * tombaient du côté du bureau — celui qui attend un événement que leur
 * navigateur n'émet pas.
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
 * Safari, et lui seul.
 *
 * Sa chaîne d'agent contient « Safari » — mais celle de Chrome aussi, et celle
 * d'Edge, et celle d'Opera : tous l'ont recopiée pour ne pas être écartés par
 * les sites des années deux mille. On reconnaît donc Safari en écartant ceux qui
 * se réclament de lui.
 */
function estSafari(agent: string): boolean {
  if (!/Safari/.test(agent)) return false;

  return !/Chrome|Chromium|Edg|OPR|Firefox/.test(agent);
}
