import type { DepotFige } from "../fige";
import type { VerdictFidelite } from "../juges/fidelite";
import { jugerLaFideliteVia, jugerLesDoublonsVia, type Facture } from "../openrouter/juges";
import { JUGE_PRINCIPAL, KIMI_K2_0905_ECARTE, type ModeleOpenRouter } from "../openrouter/modeles";
import {
  LOTS_FIDELITE,
  PAIRES_TEMOINS,
  extraireConcept,
  extrairePaire,
  lireVerdictsHaiku,
  type LotFidelite,
} from "./temoins";

/**
 * Les deux volets de l'arrêt 1 : chacun soumet ses entrées au juge, compte
 * contre l'attendu et affiche son verdict.
 */

/**
 * Le double de `TOKENS_DES_JUGES` : sur six paires groupées, certains modèles
 * (GLM-5) épuisent le budget en raisonnement invisible avant de rendre. La
 * campagne, un dépôt à la fois, reste sur `TOKENS_DES_JUGES`.
 */
const MAX_TOKENS_VALIDATION = 8000;

/**
 * `undefined` garde le défaut du client, `{ effort: "low" }`. `false` pour les
 * fournisseurs qui refusent le paramètre en 404 (Kimi via Novita) et les
 * modèles sans raisonnement (Haiku).
 */
function reasoningPour(
  juge: ModeleOpenRouter,
): { effort: "low" | "medium" | "high" } | false | undefined {
  if (juge.id === KIMI_K2_0905_ECARTE.id) return false;
  if (juge.id === JUGE_PRINCIPAL.id) return false;
  return undefined;
}

export async function volet1Doublon(
  fige: { depots: DepotFige[] },
  juge: ModeleOpenRouter,
): Promise<{ passe: boolean; factures: Facture[] }> {
  console.info("\n## Volet 1 — juge du doublon, 6 paires témoins\n");

  // Un seul appel pour les six paires : c'est ce que fait le juge en campagne,
  // et Alibaba (Qwen) aplatit `{paires: [...]}` quand un seul item est soumis,
  // ce que Zod refuse.
  const paires = PAIRES_TEMOINS.map((temoin) => extrairePaire(fige, temoin));
  const { verdicts, facture } = await jugerLesDoublonsVia(
    juge,
    "témoins arrêt 1",
    paires,
    MAX_TOKENS_VALIDATION,
    reasoningPour(juge),
  );

  let corrects = 0;
  let jumeauxSauves = true;
  for (let i = 0; i < PAIRES_TEMOINS.length; i++) {
    const temoin = PAIRES_TEMOINS[i];
    const verdict = verdicts[i];
    if (!temoin || !verdict) throw new Error(`Verdict manquant à la paire #${i + 1}.`);

    const rendu =
      verdict.independants === null
        ? "abstention"
        : verdict.independants
          ? "independants"
          : "non independants";
    const juste = verdict.independants !== null && rendu === temoin.attendu;
    if (juste) corrects += 1;
    if (temoin.attendu === "non independants" && !juste) jumeauxSauves = false;

    console.info(
      `${juste ? "✓" : "✗"} ${temoin.depot.replace(/\.[^.]+$/, "")} — ${temoin.intitule}`,
    );
    console.info(`     attendu : ${temoin.attendu}    rendu : ${rendu}`);
    if (verdict.questionSurA) console.info(`     A ← ${verdict.questionSurA}`);
    if (verdict.questionSurB) console.info(`     B ← ${verdict.questionSurB}`);
    console.info("");
  }

  console.info(
    `     appel groupé : ${facture.inputTokens} in / ${facture.outputTokens} out, ${(facture.coutUsd * 100).toFixed(2)} ¢, ${facture.latencyMs} ms`,
  );

  const passe = corrects >= 5 && jumeauxSauves;
  console.info(
    `→ Volet 1 : ${corrects}/6 corrects, jumeaux ${jumeauxSauves ? "tenus" : "LIBÉRÉS"} — ${
      passe ? "PASSE" : "ÉCHOUE"
    } (critère : ≥ 5/6 et les deux non indépendants obligatoires)`,
  );

  return { passe, factures: [facture] };
}

export async function volet2Fidelite(
  fige: { depots: DepotFige[] },
  juge: ModeleOpenRouter,
): Promise<{ passe: boolean; factures: Facture[] }> {
  console.info("\n## Volet 2 — juge de la fidélité, 6 lots sondage\n");
  const factures: Facture[] = [];
  let totalQuestions = 0;
  let accords = 0;
  let fauxPositifsPropres = 0;

  for (const lot of LOTS_FIDELITE) {
    const { concept, variants } = extraireConcept(fige, lot);
    const { verdicts, facture } = await jugerLaFideliteVia(
      juge,
      concept,
      variants,
      MAX_TOKENS_VALIDATION,
      reasoningPour(juge),
    );
    factures.push(facture);

    const koDuCandidat = verdicts.filter((v) => v.juste === false).length;
    // Référence question par question : les verdicts Haiku du figé `11h58`.
    const verdictsHaiku = lireVerdictsHaiku(lot);
    // Une question sans verdict compte comme un désaccord : le taux porte sur
    // les questions soumises, pas sur ce que le juge a bien voulu rendre.
    let accordsLot = 0;
    for (let i = 0; i < variants.length; i++) {
      const rendu = verdicts[i]?.juste;
      const attendu = verdictsHaiku[i];
      totalQuestions += 1;
      if (rendu !== undefined && rendu === attendu) {
        accords += 1;
        accordsLot += 1;
      }
    }

    if (lot.categorie === "propre" && koDuCandidat > 0) fauxPositifsPropres += koDuCandidat;

    afficherLeLot({
      lot,
      nbQuestions: variants.length,
      koDuCandidat,
      accordsLot,
      verdicts,
      verdictsHaiku,
      facture,
    });
  }

  const tauxAccord = (accords / totalQuestions) * 100;
  const passe = tauxAccord >= 80 && fauxPositifsPropres === 0;
  console.info(
    `→ Volet 2 : accord ${accords}/${totalQuestions} (${tauxAccord.toFixed(1)} %), faux positifs sur lots propres : ${fauxPositifsPropres} — ${
      passe ? "PASSE" : "ÉCHOUE"
    } (critères : ≥ 80 % et 0 faux positif sur propres)`,
  );

  return { passe, factures };
}

function afficherLeLot({
  lot,
  nbQuestions,
  koDuCandidat,
  accordsLot,
  verdicts,
  verdictsHaiku,
  facture,
}: {
  lot: LotFidelite;
  nbQuestions: number;
  koDuCandidat: number;
  accordsLot: number;
  verdicts: VerdictFidelite[];
  verdictsHaiku: (boolean | null)[];
  facture: Facture;
}): void {
  const etiquette =
    lot.categorie === "propre" ? "propre" : lot.categorie === "infidele" ? "infidèle" : "moyen";
  console.info(`${lot.depot.replace(/\.[^.]+$/, "")} concept ${lot.concept} (${etiquette})`);
  console.info(
    `  Haiku : ${lot.koHaiku}/${nbQuestions} KO    Candidat : ${koDuCandidat}/${nbQuestions} KO    accord : ${accordsLot}/${nbQuestions}`,
  );
  for (let i = 0; i < verdicts.length; i++) {
    const v = verdicts[i];
    if (!v) continue;
    const attenduH = verdictsHaiku[i];
    const marque = v.juste === attenduH ? " " : "≠";
    const rendu = v.juste === null ? "?" : v.juste ? "ok" : "KO";
    const attendu = attenduH === null || attenduH === undefined ? "?" : attenduH ? "ok" : "KO";
    console.info(`    ${marque} Q${i + 1} : candidat ${rendu}, Haiku ${attendu} — ${v.motif}`);
  }
  console.info(
    `    ${facture.inputTokens} in / ${facture.outputTokens} out, ${(facture.coutUsd * 100).toFixed(2)} ¢, ${facture.latencyMs} ms`,
  );
  console.info("");
}
