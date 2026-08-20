import { BANDE_DU_DOUBLON } from "../mesures/seuils";
import type { SignalementsDuDepot } from "../mesures/signalements";
import type { VerdictsDuDepot } from "./verdicts";

/**
 * Le rendement du juge du doublon par bande : le compte des non-indépendants
 * dans la bande basse contre la bande haute, pour dire si le plancher à 0,63
 * ramasse ce qu'il fallait ou si on descendait pour rien.
 */
export type RendementParBande = {
  basse: { candidats: number; confirmes: number };
  haute: { candidats: number; confirmes: number };
};

export function rendementDuDoublon(
  signalements: SignalementsDuDepot[],
  verdicts: VerdictsDuDepot[],
): RendementParBande {
  const rendement: RendementParBande = {
    basse: { candidats: 0, confirmes: 0 },
    haute: { candidats: 0, confirmes: 0 },
  };

  for (const signalement of signalements) {
    const verdict = verdicts.find((v) => v.nom === signalement.nom);
    if (!verdict) continue;

    signalement.doublons.forEach((paire, rang) => {
      const bande = paire.proximite < BANDE_DU_DOUBLON ? rendement.basse : rendement.haute;
      bande.candidats += 1;
      if (verdict.doublons[rang]?.independants === false) {
        bande.confirmes += 1;
      }
    });
  }

  return rendement;
}
