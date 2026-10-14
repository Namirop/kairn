import type { VerdictsDuDepot } from "../juges/verdicts";
import type { SignalementsDuDepot } from "./signalements";

/** Ce que les juges ont retenu des signalements, compté pour le rapport « Mesures ». */

export function trouverVerdicts(
  verdicts: VerdictsDuDepot[],
  nom: string,
): VerdictsDuDepot | undefined {
  return verdicts.find((v) => v.nom === nom);
}

export type Comptes = {
  manquesReels: number;
  inventionsReelles: number;
  doublonsConfirmes: number;
  questionsInfideles: number;
  questionsJugees: number;
  abstentions: number;
};

export function comptes(signalements: SignalementsDuDepot[], verdicts: VerdictsDuDepot[]): Comptes {
  const c: Comptes = {
    manquesReels: 0,
    inventionsReelles: 0,
    doublonsConfirmes: 0,
    questionsInfideles: 0,
    questionsJugees: 0,
    abstentions: 0,
  };

  for (const signalement of signalements) {
    const verdict = trouverVerdicts(verdicts, signalement.nom);
    if (!verdict) continue;

    c.manquesReels += verdict.manques.filter((v) => v.retenir === true).length;
    c.inventionsReelles += verdict.inventions.filter((v) => v.soutenu === false).length;
    c.doublonsConfirmes += verdict.doublons.filter((v) => v.independants === false).length;

    c.abstentions += verdict.manques.filter((v) => v.retenir === null).length;
    c.abstentions += verdict.inventions.filter((v) => v.soutenu === null).length;
    c.abstentions += verdict.doublons.filter((v) => v.independants === null).length;
    c.abstentions += verdict.attendus.filter((v) => v.verdict?.couvert === null).length;
    for (const concept of verdict.fidelite) {
      c.questionsJugees += concept.questions.length;
      c.questionsInfideles += concept.questions.filter((v) => v.juste === false).length;
      c.abstentions += concept.questions.filter((v) => v.juste === null).length;
    }
  }

  return c;
}

/** Le compte de fidélité d'un dépôt : (infidèles, jugées) pour la colonne du tableau. */
export function fideliteDuDepot(verdict: VerdictsDuDepot | undefined): {
  infideles: number;
  jugees: number;
} {
  if (!verdict) return { infideles: 0, jugees: 0 };
  let infideles = 0;
  let jugees = 0;
  for (const concept of verdict.fidelite) {
    jugees += concept.questions.length;
    infideles += concept.questions.filter((v) => v.juste === false).length;
  }
  return { infideles, jugees };
}
