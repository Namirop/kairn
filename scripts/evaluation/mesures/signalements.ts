import {
  PLANCHER_COUVERTURE,
  PLANCHER_DOUBLON,
  PLANCHER_RADOTAGE_INTER,
  PLANCHER_RADOTAGE_INTRA,
  PLANCHER_SOUTIEN,
} from "./seuils";
import type { MesuresDuDepot, Paire, PaireDeQuestions, Rapproche } from "./signaux";

/**
 * L'application des planchers aux signaux bruts, à part de `signaux.ts` pour
 * que les signaux restent calculables sans seuil : c'est ce que `--calibrer`
 * lit quand le modèle d'embedding change et que les planchers sautent.
 *
 * Un signalement est un candidat, jamais un verdict : il attend son juge, et
 * « signalé » veut dire « à regarder », pas « fautif ».
 */

export type SignalementsDuDepot = {
  nom: string;
  segments: number;
  concepts: number;
  /** Phrases sous le plancher de couverture : candidates au manque. */
  manques: Rapproche[];
  /** Concepts sous le plancher de soutien : candidats à l'invention. */
  inventions: Rapproche[];
  /** Paires de concepts au-dessus du plancher : candidates à la redite. */
  doublons: Paire[];
  /**
   * Paires de questions, `null` quand le figé n'en porte pas. Intra-concept et
   * inter-concepts n'ont pas la même distribution, donc pas le même plancher.
   */
  radotage: { intraLot: PaireDeQuestions[]; interConcepts: PaireDeQuestions[] } | null;
};

function sousLePlancher(entrees: Rapproche[], plancher: number): Rapproche[] {
  return entrees.filter((entree) => entree.proximite < plancher);
}

function signalerLeRadotage(radotage: MesuresDuDepot["radotage"]): SignalementsDuDepot["radotage"] {
  if (radotage === null) return null;

  return {
    intraLot: radotage.intraLot.filter((paire) => paire.proximite >= PLANCHER_RADOTAGE_INTRA),
    interConcepts: radotage.interConcepts.filter(
      (paire) => paire.proximite >= PLANCHER_RADOTAGE_INTER,
    ),
  };
}

export function signaler(mesure: MesuresDuDepot): SignalementsDuDepot {
  return {
    nom: mesure.nom,
    segments: mesure.segments,
    concepts: mesure.concepts,
    manques: sousLePlancher(mesure.couverture, PLANCHER_COUVERTURE),
    inventions: sousLePlancher(mesure.soutien, PLANCHER_SOUTIEN),
    doublons: mesure.doublons.filter((paire) => paire.proximite >= PLANCHER_DOUBLON),
    radotage: signalerLeRadotage(mesure.radotage),
  };
}

/** Ce que le corpus entier donne, pour la ligne d'en-tête du rapport. */
export function totaliser(signalements: SignalementsDuDepot[]): {
  manques: number;
  inventions: number;
  doublons: number;
  depotsTouches: number;
} {
  const compter = (prendre: (s: SignalementsDuDepot) => unknown[]): number =>
    signalements.reduce((total, signalement) => total + prendre(signalement).length, 0);

  return {
    manques: compter((s) => s.manques),
    inventions: compter((s) => s.inventions),
    doublons: compter((s) => s.doublons),
    depotsTouches: signalements.filter(
      (s) => s.manques.length + s.inventions.length + s.doublons.length > 0,
    ).length,
  };
}
