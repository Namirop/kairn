import type { DepotFige } from "../fige";
import { attendusDuDepot, couvertureDesAttendus } from "../attendus";
import type { Passe } from "../mesures/embeddings";
import type { SignalementsDuDepot } from "../mesures/signalements";
import { jugerLesAttendusVia } from "../openrouter/juge-attendus";
import { jugerLeResiduVia } from "../openrouter/juge-residu";
import { jugerLesDoublonsVia } from "../openrouter/juges";
import { JUGE_PRINCIPAL } from "../openrouter/modeles";
import { appelsPour } from "../juges/doublon";
import { ajouter, type FactureCumulee } from "./facture-cumulee";
import { motifCourt } from "./motif-court";
import { PAIRES_PAR_APPEL } from "./plan";

/**
 * L'étape des juges d'une colonne : doublons, résidu et attendus, dépôt par
 * dépôt. Le juge est `JUGE_PRINCIPAL` pour toutes les colonnes.
 */

/** Le fournisseur de Haiku refuse `reasoning` : voir `reasoningPour` dans
 * `validation-du-juge/volets.ts`. */
const REASONING_HAIKU = false as const;

export type VerdictsDesJuges = {
  doublons: Map<string, number>;
  residus: Map<string, { manques: number; inventions: number }>;
  attendus: Map<string, { couverts: number; total: number }>;
};

export type ContexteDuJuge = {
  depot: DepotFige;
  signalement: SignalementsDuDepot;
  vecteur: Passe["vecteur"];
  verdicts: VerdictsDesJuges;
  facture: FactureCumulee;
  loguer: (message: string) => void;
};

async function jugerLesDoublons({ depot, signalement, verdicts, facture, loguer }: ContexteDuJuge) {
  if (signalement.doublons.length === 0) return;
  // En lots, pour tenir dans `TOKENS_DES_JUGES` sur un dépôt à beaucoup de
  // paires (un challenger verbeux en signale 60 et plus).
  let confirmes = 0;
  const nbLots = appelsPour(signalement.doublons.length);
  for (let lot = 0; lot < nbLots; lot++) {
    const debut = lot * PAIRES_PAR_APPEL;
    const paires = signalement.doublons.slice(debut, debut + PAIRES_PAR_APPEL);
    try {
      const { verdicts: tranches, facture: appel } = await jugerLesDoublonsVia(
        JUGE_PRINCIPAL,
        depot.nom,
        paires,
        undefined,
        REASONING_HAIKU,
      );
      ajouter(appel, facture);
      confirmes += tranches.filter((v) => v.independants === false).length;
    } catch (erreur) {
      const motif = motifCourt(erreur);
      loguer(`  ✗ juge doublon ${depot.nom} lot ${lot + 1}/${nbLots} — ${motif.slice(0, 200)}`);
    }
  }
  verdicts.doublons.set(depot.nom, confirmes);
}

async function jugerLeResidu({ depot, signalement, verdicts, facture, loguer }: ContexteDuJuge) {
  if (signalement.manques.length + signalement.inventions.length === 0) return;
  try {
    const { sortie, facture: appel } = await jugerLeResiduVia(
      JUGE_PRINCIPAL,
      depot.nom,
      depot.texte,
      signalement.manques,
      signalement.inventions,
      undefined,
      REASONING_HAIKU,
    );
    if (appel) ajouter(appel, facture);
    verdicts.residus.set(depot.nom, {
      manques: sortie.manques.filter((m) => m.retenir === true).length,
      inventions: sortie.inventions.filter((i) => i.soutenu === false).length,
    });
  } catch (erreur) {
    loguer(`  ✗ juge résidu ${depot.nom} — ${motifCourt(erreur).slice(0, 200)}`);
  }
}

async function jugerLesAttendus({ depot, vecteur, verdicts, facture, loguer }: ContexteDuJuge) {
  if (attendusDuDepot(depot.nom).length === 0) return;
  try {
    const couvertures = couvertureDesAttendus(depot.nom, depot.concepts, vecteur);
    const soumis = couvertures.map((c) => ({
      attendu: c.attendu,
      candidats: c.candidats.map((k) => k.concept),
    }));
    const { verdicts: tranches, facture: appel } = await jugerLesAttendusVia(
      JUGE_PRINCIPAL,
      depot.nom,
      soumis,
      undefined,
      REASONING_HAIKU,
    );
    if (appel) ajouter(appel, facture);
    verdicts.attendus.set(depot.nom, {
      couverts: tranches.filter((v) => v.couvert === true).length,
      total: tranches.length,
    });
  } catch (erreur) {
    loguer(`  ✗ juge attendus ${depot.nom} — ${motifCourt(erreur).slice(0, 200)}`);
  }
}

/** Les trois juges d'un dépôt, dans cet ordre, leurs verdicts rangés dans `verdicts`. */
export async function jugerLeDepot(contexte: ContexteDuJuge): Promise<void> {
  await jugerLesDoublons(contexte);
  await jugerLeResidu(contexte);
  await jugerLesAttendus(contexte);
}
