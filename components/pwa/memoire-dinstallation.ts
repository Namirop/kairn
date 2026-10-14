import { REFUS_AVANT_SILENCE, type RefusDInstallation } from "@/lib/domain/report-de-linvite";

/**
 * Ce qu'on retient de l'installation, sur l'appareil et non en base : l'invite
 * ne parle que de l'appareil qu'on a en main, et l'avoir installée sur son
 * téléphone ne dit rien de l'ordinateur.
 *
 * Le stockage est faillible (navigation privée, quota, confidentialité) : on
 * retombe alors sur « jamais refusé », et l'invite reparaîtra.
 */

const CLE = "cairn:invite-installation-ecartee";

/**
 * L'ancien format, un « 1 » qui valait refus pour toujours. Il reste honoré
 * comme un silence définitif sur les appareils qui le portent.
 */
const REFUS_DEFINITIF_HISTORIQUE = "1";

export function lireRefus(): RefusDInstallation | null {
  const brut = lire();

  if (!brut) return null;
  if (brut === REFUS_DEFINITIF_HISTORIQUE) {
    return { compte: REFUS_AVANT_SILENCE, dernier: new Date(0) };
  }

  return analyser(brut);
}

/**
 * L'utilisateur dit avoir installé l'application. On ne lui repropose plus.
 *
 * Sur iPhone, c'est le seul moyen de le savoir : l'application de l'écran
 * d'accueil a son propre bac à sable (ni cookies ni stockage partagés), et
 * Safari n'expose pas `getInstalledRelatedApps`.
 *
 * C'est écrit comme un refus définitif, dont la conséquence est la même : un
 * second champ ferait deux vérités à tenir d'accord.
 */
export function confirmerInstallation(maintenant: Date): void {
  ecrire({ compte: REFUS_AVANT_SILENCE, dernier: maintenant.toISOString() });
}

/** Ajoute un refus à ceux déjà comptés, et l'horodate. */
export function enregistrerRefus(maintenant: Date): void {
  const precedents = lireRefus();

  ecrire({ compte: (precedents?.compte ?? 0) + 1, dernier: maintenant.toISOString() });
}

function ecrire(memoire: { compte: number; dernier: string }): void {
  try {
    window.localStorage.setItem(CLE, JSON.stringify(memoire));
  } catch {
    // Stockage refusé. L'invite reparaîtra, et c'est tout ce qui se passe.
  }
}

function lire(): string | null {
  try {
    return window.localStorage.getItem(CLE);
  } catch {
    return null;
  }
}

/**
 * Ce qu'on relit, on ne l'a pas forcément écrit. Une valeur illisible vaut
 * absence de refus : se taire sur la foi d'une chaîne illisible serait la pire
 * des deux erreurs.
 */
function analyser(brut: string): RefusDInstallation | null {
  try {
    const valeur: unknown = JSON.parse(brut);

    if (typeof valeur !== "object" || valeur === null) return null;

    const compte = Reflect.get(valeur, "compte");
    const dernier = Reflect.get(valeur, "dernier");

    if (typeof compte !== "number" || !Number.isFinite(compte)) return null;
    if (typeof dernier !== "string") return null;

    const date = new Date(dernier);

    if (Number.isNaN(date.getTime())) return null;

    return { compte, dernier: date };
  } catch {
    return null;
  }
}
