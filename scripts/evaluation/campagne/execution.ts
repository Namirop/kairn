import type { ExtractAtomsOutput } from "@/lib/ai/schemas";
import type { Depot } from "../corpus";
import type { ConceptFige, DepotFige } from "../fige";
import { attendusDuDepot, couvertureDesAttendus, tousLesAttendus } from "../attendus";
import { plonger } from "../mesures/embeddings";
import { mesurerLeDepot, textesDuDepot } from "../mesures/signaux";
import { signaler } from "../mesures/signalements";
import { BUDGET_SORTIE_CAMPAGNE } from "../openrouter/campagne";
import { extraireVia } from "../openrouter/extraction";
import { jugerLesAttendusVia } from "../openrouter/juge-attendus";
import { jugerLeResiduVia } from "../openrouter/juge-residu";
import { jugerLesDoublonsVia, type Facture } from "../openrouter/juges";
import { JUGE_PRINCIPAL, type ModeleOpenRouter } from "../openrouter/modeles";
import { appelsPour } from "../juges/doublon";
import { PAIRES_PAR_APPEL } from "./plan";

/**
 * L'émission d'une colonne de la campagne : extraction du challenger sur les
 * 27 dépôts, puis Haiku sur les signalements et attendus de sa colonne.
 *
 * Le garde-fou de dérive s'applique dépôt par dépôt : si le coût cumulé de
 * l'extraction ou des juges dépasse **2 × son estimation**, la colonne s'arrête
 * là et l'appelant le voit dans `statut`. Aucune reprise automatique — c'est la
 * règle de campagne posée le 2026-08-21, pas un événement à rattraper au vol.
 *
 * Le juge est fixé à `JUGE_PRINCIPAL` (Haiku via OpenRouter), même pour tous les
 * challengers. Ce qui varie d'une colonne à l'autre, c'est l'extraction ; les
 * juges sont la même règle pour tout le monde.
 */

/** Le juge Haiku ne supporte pas `reasoning` chez son fournisseur — voir `valider-le-juge.ts`. */
const REASONING_HAIKU = false as const;

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
  factureExtraction: { in: number; out: number; usd: number; appels: number };
  factureJuges: { in: number; out: number; usd: number; appels: number };
  statut: Statut;
};

function ajouter(a: Facture, b: { in: number; out: number; usd: number; appels: number }): void {
  b.in += a.inputTokens;
  b.out += a.outputTokens;
  b.usd += a.coutUsd;
  b.appels += 1;
}

function motifCourt(erreur: unknown): string {
  const cause = erreur instanceof Error && erreur.cause instanceof Error ? erreur.cause : null;
  return erreur instanceof Error
    ? cause
      ? `${erreur.message} — cause : ${cause.message}`
      : erreur.message
    : String(erreur);
}

function faireDepotFige(nom: string, texte: string, extraction: ExtractAtomsOutput): DepotFige {
  const concepts: ConceptFige[] = extraction.atoms.map((atome) => ({
    concept: atome.concept,
    tags: atome.tags,
    uncertain: atome.uncertain,
  }));
  return {
    nom,
    texte,
    nature: extraction.nature,
    rejet: extraction.rejected,
    concepts,
  };
}

/**
 * Fait tourner une colonne : extraction dépôt par dépôt (garde-fou 2×), puis
 * juges Haiku sur chaque dépôt (garde-fou 2× à part). Retourne un score utile
 * pour bâtir le tableau aveuglé, indépendamment de la nature du challenger.
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
  const figes: DepotFige[] = [];
  const echecs = new Map<string, string>();

  // 1. Extraction dépôt par dépôt, avec garde-fou 2× cumulé.
  for (let rang = 0; rang < corpus.length; rang++) {
    const depot = corpus[rang]!;
    // Le texte de la campagne : figé Sonnet si dispo (l'OCR y est déjà fait),
    // sinon le texte brut du corpus. On ne rejoue pas l'OCR par challenger —
    // le plan à sec l'a acté, et une image OCR-ée deux fois mesurerait autre
    // chose que ce qu'on compare.
    const texte = textesDuFige.get(depot.nom) ?? depot.texte;
    if (texte === "") {
      echecs.set(depot.nom, "texte vide : ni figé ni corpus n'ont fourni de contenu");
      figes.push({ nom: depot.nom, texte: "", rejet: null, concepts: [] });
      continue;
    }
    try {
      const { sortie, facture } = await extraireVia(challenger, texte, BUDGET_SORTIE_CAMPAGNE);
      ajouter(facture, factureExtraction);
      figes.push(faireDepotFige(depot.nom, texte, sortie));
      loguer(
        `  ✓ ${depot.nom} — ${sortie.atoms.length} concepts, ${(facture.coutUsd * 100).toFixed(2)} ¢ (cumul : ${factureExtraction.usd.toFixed(4)} $)`,
      );
    } catch (erreur) {
      // Un `AICallFailedError` masque la cause d'origine (réponse du fournisseur,
      // 400 sur schéma refusé, timeout). Sans elle on diagnostique à l'aveugle —
      // l'arrêt 1 avait montré que les fournisseurs Alibaba/Novita mentent sur
      // ce qu'ils supportent. On journalise donc la chaîne complète.
      const cause = erreur instanceof Error && erreur.cause instanceof Error ? erreur.cause : null;
      const motif =
        erreur instanceof Error
          ? cause
            ? `${erreur.message} — cause : ${cause.message}`
            : erreur.message
          : String(erreur);
      echecs.set(depot.nom, motif);
      figes.push({ nom: depot.nom, texte, rejet: null, concepts: [], echec: { motif } });
      loguer(`  ✗ ${depot.nom} — échec : ${motif.slice(0, 400)}`);
    }
    // Garde-fou : ne coupe **que s'il reste des dépôts à traiter**. Sur le
    // dernier dépôt, le dépassement est déjà consommé — poursuivre coûte zéro
    // en extraction, et priver les juges de la colonne effacerait la mesure.
    // Le rapport annonce alors que le seuil a été franchi malgré tout.
    const dernier = rang === corpus.length - 1;
    if (!dernier && factureExtraction.usd > 2 * coutExtractionEstime) {
      const info = {
        code: "arret-2x-extraction" as const,
        nom: depot.nom,
        coutReel: factureExtraction.usd,
        coutEstime: coutExtractionEstime,
      };
      loguer(
        `  ⨯ garde-fou dérive 2× extraction déclenché après ${depot.nom} — ${info.coutReel.toFixed(4)} $ contre ${info.coutEstime.toFixed(4)} $ estimés.`,
      );
      return {
        challenger,
        depots: scoresPartiels(figes, echecs, new Map(), new Map(), new Map()),
        factureExtraction,
        factureJuges,
        statut: info,
      };
    }
  }

  // 2. Plongée du figé simulé + tous les attendus — même règle que
  // `mesurer-le-corpus`. Sans les attendus, `couvertureDesAttendus` casse à
  // la première comparaison. Le cache absorbe ce qui a déjà été calculé.
  const textes = [...figes.flatMap(textesDuDepot), ...tousLesAttendus()];
  loguer(`  · plongée : ${textes.length} textes à faire vecteurs (doublons compris).`);
  const passe = await plonger(textes);
  loguer(`  · vecteurs : ${passe.calcules} calculés, ${passe.enCache} au cache.`);

  // 3. Mesures et signalements par dépôt.
  const mesures = figes.map((depot) => mesurerLeDepot(depot, passe.vecteur));
  const signalements = mesures.map(signaler);

  // 4. Juges Haiku sur chaque dépôt, garde-fou 2× cumulé.
  const doublons = new Map<string, number>();
  const residus = new Map<string, { manques: number; inventions: number }>();
  const attendus = new Map<string, { couverts: number; total: number }>();

  for (const signalement of signalements) {
    const depot = figes.find((f) => f.nom === signalement.nom);
    if (!depot || depot.echec) continue;

    // Doublons — découpés en lots comme `jugerLesDoublons` du produit, pour
    // ne pas dépasser TOKENS_DES_JUGES sur un dépôt à beaucoup de paires (un
    // Mistral verbeux peut sortir 20 concepts et 60+ paires signalées).
    if (signalement.doublons.length > 0) {
      let confirmes = 0;
      const nbLots = appelsPour(signalement.doublons.length);
      for (let lot = 0; lot < nbLots; lot++) {
        const debut = lot * PAIRES_PAR_APPEL;
        const paires = signalement.doublons.slice(debut, debut + PAIRES_PAR_APPEL);
        try {
          const { verdicts, facture } = await jugerLesDoublonsVia(
            JUGE_PRINCIPAL,
            depot.nom,
            paires,
            undefined,
            REASONING_HAIKU,
          );
          ajouter(facture, factureJuges);
          confirmes += verdicts.filter((v) => v.independants === false).length;
        } catch (erreur) {
          const motif = motifCourt(erreur);
          loguer(`  ✗ juge doublon ${depot.nom} lot ${lot + 1}/${nbLots} — ${motif.slice(0, 200)}`);
        }
      }
      doublons.set(depot.nom, confirmes);
    }

    // Résidu
    if (signalement.manques.length + signalement.inventions.length > 0) {
      try {
        const { sortie, facture } = await jugerLeResiduVia(
          JUGE_PRINCIPAL,
          depot.nom,
          depot.texte,
          signalement.manques,
          signalement.inventions,
          undefined,
          REASONING_HAIKU,
        );
        if (facture) ajouter(facture, factureJuges);
        residus.set(depot.nom, {
          manques: sortie.manques.filter((m) => m.retenir === true).length,
          inventions: sortie.inventions.filter((i) => i.soutenu === false).length,
        });
      } catch (erreur) {
        loguer(`  ✗ juge résidu ${depot.nom} — ${motifCourt(erreur).slice(0, 200)}`);
      }
    }

    // Attendus
    if (attendusDuDepot(depot.nom).length > 0) {
      try {
        const couvertures = couvertureDesAttendus(depot.nom, depot.concepts, passe.vecteur);
        const soumis = couvertures.map((c) => ({
          attendu: c.attendu,
          candidats: c.candidats.map((k) => k.concept),
        }));
        const { verdicts, facture } = await jugerLesAttendusVia(
          JUGE_PRINCIPAL,
          depot.nom,
          soumis,
          undefined,
          REASONING_HAIKU,
        );
        if (facture) ajouter(facture, factureJuges);
        attendus.set(depot.nom, {
          couverts: verdicts.filter((v) => v.couvert === true).length,
          total: verdicts.length,
        });
      } catch (erreur) {
        loguer(`  ✗ juge attendus ${depot.nom} — ${motifCourt(erreur).slice(0, 200)}`);
      }
    }

    if (factureJuges.usd > 2 * coutJugesEstime) {
      const info = {
        code: "arret-2x-juges" as const,
        nom: depot.nom,
        coutReel: factureJuges.usd,
        coutEstime: coutJugesEstime,
      };
      loguer(
        `  ⨯ garde-fou dérive 2× juges déclenché après ${depot.nom} — ${info.coutReel.toFixed(4)} $ contre ${info.coutEstime.toFixed(4)} $ estimés.`,
      );
      return {
        challenger,
        depots: scoresPartiels(figes, echecs, doublons, residus, attendus),
        factureExtraction,
        factureJuges,
        statut: info,
      };
    }
  }

  return {
    challenger,
    depots: scoresPartiels(figes, echecs, doublons, residus, attendus),
    factureExtraction,
    factureJuges,
    statut: { code: "complete" },
  };
}

function scoresPartiels(
  figes: DepotFige[],
  echecs: Map<string, string>,
  doublons: Map<string, number>,
  residus: Map<string, { manques: number; inventions: number }>,
  attendus: Map<string, { couverts: number; total: number }>,
): ScoreDepot[] {
  return figes.map((f) => {
    const attendu = attendus.get(f.nom);
    return {
      nom: f.nom,
      nbConcepts: f.concepts.length,
      rejet: f.rejet,
      echec: echecs.get(f.nom) ?? null,
      doublonsSignales: 0,
      doublonsConfirmes: doublons.get(f.nom) ?? 0,
      manquesSignales: 0,
      manquesConfirmes: residus.get(f.nom)?.manques ?? 0,
      inventionsSignalees: 0,
      inventionsConfirmees: residus.get(f.nom)?.inventions ?? 0,
      attendusCouverts: attendu?.couverts ?? 0,
      attendusTotal: attendu?.total ?? 0,
    };
  });
}
