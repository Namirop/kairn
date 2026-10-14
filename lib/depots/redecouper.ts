import { lireDepotAReprendre, repartirEnDecoupage } from "@/lib/db/reprise-depot";
import { rendreDepot, reserverDepot } from "@/lib/db/quota-depots";
import { lireFuseauUtilisateur } from "@/lib/db/reglages-du-compte";
import { redecoupable } from "@/lib/domain/etat-depot";
import type { TraduireLesRefus } from "@/lib/depots/bornes-du-depot";
import { refusDeQuota } from "@/lib/depots/refus-de-quota";
import { textesDesRefus } from "@/lib/depots/textes-des-refus";
import { mettreEnFile } from "@/lib/jobs/queue";

/**
 * Relance l'extraction sur un texte déjà déposé, quand le découpage n'a rien
 * donné d'utilisable, sans dupliquer le texte en base.
 *
 * Ça coûte une extraction, donc une place du jour comme un dépôt : gratuit, le
 * redécoupage contournerait le quota.
 */

export type ResultatRedecoupage = { ok: true } | { ok: false; motif: string; quota?: boolean };

export async function redecouper(
  userId: string,
  inputId: string,
  t: TraduireLesRefus = textesDesRefus(),
): Promise<ResultatRedecoupage> {
  const depot = await lireDepotAReprendre(inputId, userId);

  if (!depot) return { ok: false, motif: t("introuvable") };

  if (!redecoupable(depot.etat)) {
    return { ok: false, motif: t("rienARedecouper") };
  }

  if (!depot.aDuTexte) {
    return { ok: false, motif: t("pasDeTexteARedecouper") };
  }

  const fuseau = await lireFuseauUtilisateur(userId);
  const place = await reserverDepot(userId, fuseau);

  if (!place.accorde) return { ok: false, ...refusDeQuota(place.motif, place.plafond, t) };

  // Un redécoupage qui n'a pas lieu rend sa place.
  if (!(await repartirEnDecoupage(inputId, userId))) {
    await rendreDepot(userId, fuseau);
    return { ok: false, motif: t("introuvable") };
  }

  await mettreEnFile(inputId, "ATOMS");

  return { ok: true };
}
