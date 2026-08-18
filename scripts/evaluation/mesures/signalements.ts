import {
  PLANCHER_COUVERTURE,
  PLANCHER_DOUBLON,
  PLANCHER_RADOTAGE,
  PLANCHER_SOUTIEN,
} from "./seuils";
import type { MesuresDuDepot, Paire, Rapproche } from "./signaux";

/**
 * L'application des planchers aux signaux bruts.
 *
 * Séparé de `signaux.ts`, et ce n'est pas de la cérémonie : les signaux se
 * calculent sans seuil, et doivent pouvoir continuer à se calculer sans seuil.
 * C'est ce qui permet de recalibrer — `npm run eval:mesures -- --calibrer`
 * rend les mêmes listes, triées, sans rien signaler. Le jour où le modèle
 * d'embedding change, les planchers sautent et la géométrie, elle, ne bouge pas.
 *
 * **Un signalement est un candidat, jamais un verdict.** Rien n'est écarté ici :
 * une phrase signalée au manque attend le juge de résidu, une paire signalée au
 * doublon attend le juge du doublon. Le mot « signalé » du rapport veut dire
 * « à regarder », pas « fautif ».
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
   * Paires de questions, `null` quand le figé n'en porte pas — et quand le
   * plancher n'est pas encore posé, ce qui est le cas tant qu'aucun passage de
   * génération n'a gelé ses questions. Les deux se lisent « non mesuré », et le
   * rapport ne doit jamais les afficher comme « zéro ».
   */
  radotage: { intraLot: Paire[]; interConcepts: Paire[] } | null;
};

function sousLePlancher(entrees: Rapproche[], plancher: number): Rapproche[] {
  return entrees.filter((entree) => entree.proximite < plancher);
}

/** Deux façons de n'avoir rien à signaler : pas de questions, ou pas de plancher. */
function signalerLeRadotage(
  radotage: MesuresDuDepot["radotage"],
  plancher: number | null,
): SignalementsDuDepot["radotage"] {
  if (radotage === null || plancher === null) return null;

  return {
    intraLot: radotage.intraLot.filter((paire) => paire.proximite >= plancher),
    interConcepts: radotage.interConcepts.filter((paire) => paire.proximite >= plancher),
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
    radotage: signalerLeRadotage(mesure.radotage, PLANCHER_RADOTAGE),
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
