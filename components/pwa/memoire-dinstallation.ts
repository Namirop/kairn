import { REFUS_AVANT_SILENCE, type RefusDInstallation } from "@/lib/domain/report-de-linvite";

/**
 * Sur l'appareil et non en base : installée sur le téléphone, l'app ne l'est pas
 * sur l'ordinateur. Stockage faillible (navigation privée, quota) : on retombe
 * sur « jamais refusé », l'invite reparaît.
 */

const CLE = "cairn:invite-installation-ecartee";

/** Ancien format, encore présent sur des appareils : vaut silence définitif. */
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
 * Sur iPhone, seul moyen de savoir : l'app de l'écran d'accueil a son propre bac
 * à sable, et Safari n'expose pas `getInstalledRelatedApps`. Écrit comme un refus
 * définitif, même effet : un second champ ferait deux vérités à accorder.
 */
export function confirmerInstallation(maintenant: Date): void {
  ecrire({ compte: REFUS_AVANT_SILENCE, dernier: maintenant.toISOString() });
}

export function enregistrerRefus(maintenant: Date): void {
  const precedents = lireRefus();

  ecrire({ compte: (precedents?.compte ?? 0) + 1, dernier: maintenant.toISOString() });
}

function ecrire(memoire: { compte: number; dernier: string }): void {
  try {
    window.localStorage.setItem(CLE, JSON.stringify(memoire));
  } catch {
    // Stockage refusé : l'invite reparaîtra, sans autre conséquence.
  }
}

function lire(): string | null {
  try {
    return window.localStorage.getItem(CLE);
  } catch {
    return null;
  }
}

/** Illisible vaut absence de refus : se taire sur une chaîne illisible serait la pire erreur. */
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
