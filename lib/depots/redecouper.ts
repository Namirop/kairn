import { lireDepotAReprendre, repartirEnDecoupage } from "@/lib/db/reprise-depot";
import { rendreDepot, reserverDepot } from "@/lib/db/quota-depots";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { redecoupable } from "@/lib/domain/etat-depot";
import { refusDeQuota } from "@/lib/depots/refus-de-quota";
import { enqueueJob } from "@/lib/jobs/queue";

/**
 * Relancer l'extraction sur un texte déjà déposé.
 *
 * Le cas d'usage est celui-là et pas un autre : le découpage n'a rien donné
 * d'utilisable, on a supprimé les concepts un par un, et on veut retenter sur
 * le même texte plutôt que de le recoller. Sans ce geste, la seule issue était
 * de refaire un dépôt — donc de dupliquer le texte en base pour rien.
 *
 * Ça coûte une extraction, donc ça prend une place du jour, exactement comme un
 * dépôt. Un redécoupage gratuit serait une porte ouverte : quinze dépôts par
 * jour et autant de relances qu'on veut sur chacun.
 */

export type ResultatRedecoupage = { ok: true } | { ok: false; motif: string; quota?: boolean };

export async function redecouper(userId: string, inputId: string): Promise<ResultatRedecoupage> {
  const depot = await lireDepotAReprendre(inputId, userId);

  if (!depot) return { ok: false, motif: "Ce dépôt est introuvable." };

  if (!redecoupable(depot.etat)) {
    return { ok: false, motif: "Il n'y a rien à redécouper dans ce dépôt." };
  }

  if (!depot.aDuTexte) {
    return { ok: false, motif: "Ce dépôt n'a pas de texte à redécouper." };
  }

  const fuseau = await lireFuseauUtilisateur(userId);
  const place = await reserverDepot(userId, fuseau);

  if (!place.accorde) return { ok: false, ...refusDeQuota(place.motif) };

  // La place prise sur un redécoupage qui n'a pas lieu est rendue : le compteur
  // suit ce qui a été lancé, pas ce qui a été tenté.
  if (!(await repartirEnDecoupage(inputId, userId))) {
    await rendreDepot(userId, fuseau);
    return { ok: false, motif: "Ce dépôt est introuvable." };
  }

  await enqueueJob(inputId, "ATOMS");

  return { ok: true };
}
