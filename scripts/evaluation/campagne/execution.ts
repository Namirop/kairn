import type { Depot } from "../corpus";
import type { DepotFige } from "../fige";
import { tousLesAttendus } from "../attendus";
import { plonger } from "../mesures/embeddings";
import { mesurerLeDepot, textesDuDepot } from "../mesures/signaux";
import { signaler, type SignalementsDuDepot } from "../mesures/signalements";
import type { ModeleOpenRouter } from "../openrouter/modeles";
import { extraireLaColonne } from "./extraction-de-colonne";
import type { FactureCumulee } from "./facture-cumulee";
import { jugerLeDepot, type VerdictsDesJuges } from "./juges-de-colonne";

/**
 * L'émission d'une colonne de la campagne : extraction du challenger sur le
 * corpus, puis les juges sur ses signalements et attendus.
 *
 * Garde-fou de dérive, dépôt par dépôt : si le coût cumulé de l'extraction ou
 * des juges dépasse 2 × son estimation, la colonne s'arrête et l'appelant le
 * voit dans `statut`. Aucune reprise automatique.
 *
 * Le juge est `JUGE_PRINCIPAL` pour toutes les colonnes : seule l'extraction
 * varie.
 */

export type ScoreDepot = {
  nom: string;
  nbConcepts: number;
  rejet: string | null;
  echec: string | null;
  /** Doublons tranchés « non indépendants » par le juge. */
  doublonsConfirmes: number;
  doublonsSignales: number;
  /** Manques que le juge veut retenir (bruit exclu). */
  manquesConfirmes: number;
  manquesSignales: number;
  /** Concepts marqués « invention » par le juge. */
  inventionsConfirmees: number;
  inventionsSignalees: number;
  attendusCouverts: number;
  attendusTotal: number;
};

export type Statut =
  | { code: "complete" }
  | { code: "arret-2x-extraction"; nom: string; coutReel: number; coutEstime: number }
  | { code: "arret-2x-juges"; nom: string; coutReel: number; coutEstime: number };

export type ScoreDeColonne = {
  challenger: ModeleOpenRouter;
  depots: ScoreDepot[];
  factureExtraction: FactureCumulee;
  factureJuges: FactureCumulee;
  statut: Statut;
};

type Arret = Exclude<Statut, { code: "complete" }>;

function arreter(
  code: Arret["code"],
  libelle: string,
  nom: string,
  facture: FactureCumulee,
  coutEstime: number,
  loguer: (message: string) => void,
): Arret {
  const info = { code, nom, coutReel: facture.usd, coutEstime };
  loguer(
    `  ⨯ garde-fou dérive 2× ${libelle} déclenché après ${nom} — ${info.coutReel.toFixed(4)} $ contre ${info.coutEstime.toFixed(4)} $ estimés.`,
  );
  return info;
}

/** Les attendus se plongent aussi, sinon `couvertureDesAttendus` casse à la première comparaison. */
async function plongerLaColonne(figes: DepotFige[], loguer: (message: string) => void) {
  const textes = [...figes.flatMap(textesDuDepot), ...tousLesAttendus()];
  loguer(`  · plongée : ${textes.length} textes à faire vecteurs (doublons compris).`);
  const passe = await plonger(textes);
  loguer(`  · vecteurs : ${passe.calcules} calculés, ${passe.enCache} au cache.`);
  return passe;
}

/**
 * Les deux garde-fous 2× sont distincts : extraction et juges ont chacun leur
 * estimation.
 */
export async function passerParColonne(
  challenger: ModeleOpenRouter,
  corpus: Depot[],
  textesDuFige: Map<string, string>,
  coutExtractionEstime: number,
  coutJugesEstime: number,
  loguer: (message: string) => void,
): Promise<ScoreDeColonne> {
  const factureExtraction = { in: 0, out: 0, usd: 0, appels: 0 };
  const factureJuges = { in: 0, out: 0, usd: 0, appels: 0 };
  const verdicts: VerdictsDesJuges = {
    doublons: new Map(),
    residus: new Map(),
    attendus: new Map(),
  };
  // Vide tant que la colonne n'a pas été plongée : un arrêt à l'extraction
  // rend des dépôts sans aucun signalement mesuré.
  const signalementsParDepot = new Map<string, SignalementsDuDepot>();
  const { figes, echecs, arretApres } = await extraireLaColonne(
    challenger,
    corpus,
    textesDuFige,
    coutExtractionEstime,
    factureExtraction,
    loguer,
  );
  const rendre = (statut: Statut): ScoreDeColonne => ({
    challenger,
    depots: scoresPartiels(figes, echecs, signalementsParDepot, verdicts),
    factureExtraction,
    factureJuges,
    statut,
  });
  if (arretApres !== null) {
    return rendre(
      arreter(
        "arret-2x-extraction",
        "extraction",
        arretApres,
        factureExtraction,
        coutExtractionEstime,
        loguer,
      ),
    );
  }

  const passe = await plongerLaColonne(figes, loguer);
  const mesures = figes.map((depot) => mesurerLeDepot(depot, passe.vecteur));
  const signalements = mesures.map(signaler);
  for (const signalement of signalements) signalementsParDepot.set(signalement.nom, signalement);

  for (const signalement of signalements) {
    const depot = figes.find((f) => f.nom === signalement.nom);
    if (!depot || depot.echec) continue;
    await jugerLeDepot({
      depot,
      signalement,
      vecteur: passe.vecteur,
      verdicts,
      facture: factureJuges,
      loguer,
    });
    if (factureJuges.usd > 2 * coutJugesEstime) {
      return rendre(
        arreter("arret-2x-juges", "juges", depot.nom, factureJuges, coutJugesEstime, loguer),
      );
    }
  }

  return rendre({ code: "complete" });
}

function scoresPartiels(
  figes: DepotFige[],
  echecs: Map<string, string>,
  signalements: Map<string, SignalementsDuDepot>,
  { doublons, residus, attendus }: VerdictsDesJuges,
): ScoreDepot[] {
  return figes.map((f) => {
    const attendu = attendus.get(f.nom);
    const signalement = signalements.get(f.nom);
    return {
      nom: f.nom,
      nbConcepts: f.concepts.length,
      rejet: f.rejet,
      echec: echecs.get(f.nom) ?? null,
      doublonsSignales: signalement?.doublons.length ?? 0,
      doublonsConfirmes: doublons.get(f.nom) ?? 0,
      manquesSignales: signalement?.manques.length ?? 0,
      manquesConfirmes: residus.get(f.nom)?.manques ?? 0,
      inventionsSignalees: signalement?.inventions.length ?? 0,
      inventionsConfirmees: residus.get(f.nom)?.inventions ?? 0,
      attendusCouverts: attendu?.couverts ?? 0,
      attendusTotal: attendu?.total ?? 0,
    };
  });
}
