import { PRIX_ANNUEL, PRIX_MENSUEL } from "@/lib/domain/prix";
import type { CadenceStripe } from "@/lib/domain/rapport-de-stripe";
import { CLE_DU_PRIX, prixDeLaCadence } from "./catalogue";
import { modeDePaiement, type ModeDePaiement } from "./config";

/**
 * Ce que l'écran de pilotage sait du paiement, et rien de plus.
 *
 * **Une lecture, jamais un levier.** L'écran d'administration manœuvre les
 * réglages du modèle ; le paiement, lui, ne s'y manœuvre pas — `PAIEMENT_LIVE`
 * reste un geste chez l'hébergeur, pour la raison qu'énonce `config.ts`. Ce
 * module ne sert donc qu'à répondre à deux questions qu'on se pose vraiment :
 * dans quel monde suis-je, et le catalogue répond-il ?
 *
 * La seconde est la plus utile. Un catalogue de production dont les clés ou les
 * montants divergeraient de la page ferait échouer chaque achat au clic sur
 * « Payer », et rien d'autre ne le signalerait avant le premier client.
 *
 * **Aucun secret ne sort d'ici.** Le mode se déduit du préfixe de la clé, jamais
 * de la clé elle-même.
 */

export type LigneDeCatalogue = {
  cadence: CadenceStripe;
  cle: string;
  /** Ce que la page annonce, en euros. */
  annonce: number;
  /** L'identifiant résolu, ou la raison du refus. */
  resolu: { prix: string } | { erreur: string };
};

export type EtatDuPaiement = {
  mode: ModeDePaiement;
  catalogue: LigneDeCatalogue[];
};

const ANNONCE: Record<CadenceStripe, number> = {
  month: PRIX_MENSUEL,
  year: PRIX_ANNUEL,
};

export async function lireLEtatDuPaiement(): Promise<EtatDuPaiement> {
  const mode = modeDePaiement();

  // Paiement fermé : il n'y a personne à qui demander le catalogue, et le
  // demander quand même remplirait l'écran d'une erreur qui n'en est pas une.
  if (mode === "ferme") return { mode, catalogue: [] };

  const cadences: CadenceStripe[] = ["month", "year"];
  const catalogue = await Promise.all(cadences.map((cadence) => resoudre(cadence)));

  return { mode, catalogue };
}

async function resoudre(cadence: CadenceStripe): Promise<LigneDeCatalogue> {
  const ligne = { cadence, cle: CLE_DU_PRIX[cadence], annonce: ANNONCE[cadence] };

  try {
    return { ...ligne, resolu: { prix: await prixDeLaCadence(cadence) } };
  } catch (erreur) {
    // `prixDeLaCadence` refuse déjà pour la bonne raison — clé absente, montant
    // divergent, cadence inattendue — et son message la nomme. On le montre tel
    // quel : c'est exactement ce que verrait quelqu'un qui essaie d'acheter.
    return { ...ligne, resolu: { erreur: erreur instanceof Error ? erreur.message : "illisible" } };
  }
}
