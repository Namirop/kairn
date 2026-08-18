import { REFUS_AVANT_SILENCE, type RefusDInstallation } from "@/lib/domain/report-de-linvite";

/**
 * Les refus d'installation, gardés sur l'appareil.
 *
 * Sur l'appareil et non en base : cette invite ne parle que du téléphone qu'on a
 * en main. Quelqu'un qui a installé Kairn sur son mobile a toutes les raisons de
 * se la voir proposer sur son ordinateur, et un réglage de compte le lui
 * interdirait.
 *
 * Le stockage est faillible — navigation privée, quota, réglage de
 * confidentialité — et son échec n'est pas une erreur du produit. On retombe
 * alors sur « jamais refusé », c'est-à-dire sur une invite qui reparaîtra à la
 * prochaine visite. C'est le moindre mal : l'alternative serait un aller-retour
 * serveur pour un réglage qui ne quitte pas cette machine.
 */

const CLE = "cairn:invite-installation-ecartee";

/**
 * La première version ne stockait qu'un « 1 », et il valait pour toujours.
 * Quiconque le porte a refusé sous ce régime-là : on l'honore tel qu'il a été
 * donné, en silence définitif, plutôt que de rouvrir une porte qu'on avait
 * annoncée fermée.
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

/** Ajoute un refus à ceux déjà comptés, et l'horodate. */
export function enregistrerRefus(maintenant: Date): void {
  const precedents = lireRefus();
  const refus = {
    compte: (precedents?.compte ?? 0) + 1,
    dernier: maintenant.toISOString(),
  };

  try {
    window.localStorage.setItem(CLE, JSON.stringify(refus));
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
 * Ce qu'on relit, on ne l'a pas forcément écrit : une extension, une version
 * antérieure du produit ou une main curieuse peuvent avoir posé n'importe quoi
 * sous cette clef. Une valeur qu'on ne comprend pas est traitée comme une
 * absence de refus — se taire sur la foi d'une chaîne illisible serait la pire
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
