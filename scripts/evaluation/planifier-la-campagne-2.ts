import "dotenv/config";
import { basename } from "node:path";
import { finalistes } from "./campagne/finalistes";
import { dernierFige, lireFige } from "./fige";
import { BANDEAU_DE_CAMPAGNE, BUDGET_SORTIE_CAMPAGNE } from "./openrouter/campagne";
import { JUGE_PRINCIPAL, REFERENCE } from "./openrouter/modeles";
import { conceptsQuestionnables, estimerColonne } from "./campagne/plan-questions";

/**
 * Le plan à sec de la campagne 2 (close, sans commande : voir
 * `docs/outillage.md`, « Les commandes retirées »). N'émet aucun appel.
 *
 * Protocole :
 * 1. La colonne de référence (Sonnet) n'est pas rejouée : ses questions et ses
 *    verdicts de fidélité sont déjà au figé et dans `verdicts/`.
 * 2. Un budget de sortie unique, `BUDGET_SORTIE_CAMPAGNE` : un modèle qui
 *    déborde compte comme échec de schéma.
 * 3. Radotage, cible vrai/faux et couverture des formats sont géométriques :
 *    pas de juge, pas de dépense.
 *
 * Tokens estimés à chars/4 pour le français, marge ~20 %.
 */

async function main(): Promise<void> {
  console.info("# Plan à sec — campagne 2\n");
  console.info(BANDEAU_DE_CAMPAGNE);
  console.info();
  console.info("## Rappels non négociables\n");
  console.info(
    "- La colonne de référence Sonnet questions n'est pas rejouée (figé `11h58`, verdicts fidélité déjà rendus).",
  );
  console.info(
    `- Budget de sortie unique : **${BUDGET_SORTIE_CAMPAGNE} tokens** par appel, même barre pour tous.`,
  );
  console.info(
    "- Radotage, cible vrai/faux et couverture des formats sont des mesures géométriques — pas de juge LLM.",
  );
  console.info();

  const cheminFige = dernierFige();
  if (!cheminFige) throw new Error("Aucun figé disponible.");
  const fige = lireFige(cheminFige);

  // Les `uncertain` s'écartent selon la nature du dépôt.
  const parDepot = fige.depots.map((d) => ({
    nom: d.nom,
    questionnables: conceptsQuestionnables(d),
    total: d.concepts.length,
    rejet: d.rejet !== null,
  }));
  const totalQuestionnables = parDepot.reduce((s, d) => s + d.questionnables, 0);
  const totalConcepts = parDepot.reduce((s, d) => s + d.total, 0);
  const depotsRejetes = parDepot.filter((d) => d.rejet).length;

  console.info(`## Périmètre lu`);
  console.info(`- Figé : ${basename(cheminFige)} (${fige.modele}, ${fige.emisA.slice(0, 16)} UTC)`);
  console.info(`- Corpus : ${fige.depots.length} dépôts, dont ${depotsRejetes} rejets.`);
  console.info(
    `- Concepts figés : ${totalConcepts}, dont **${totalQuestionnables} questionnables** (uncertain écartés selon la nature).`,
  );
  console.info();

  console.info(`## Coût estimé par colonne\n`);
  console.info(
    `| Colonne              | Prix in/out    | Génération A / in / out         | Juge fidélité A / in / out       | Coût   |`,
  );
  console.info(
    `|:---------------------|---------------:|:---------------------------------|:---------------------------------|-------:|`,
  );

  const prixRef = `${REFERENCE.prixInParM}/${REFERENCE.prixOutParM}`;
  console.info(
    `| ${(REFERENCE.nom + " (référence)").padEnd(20)} | ${prixRef.padStart(14)} |     colonne déjà payée au figé |     verdicts fidélité déjà rendus |   0 $  |`,
  );

  let coutTotalCampagne = 0;
  let planGenerationRef: { appels: number; tokensIn: number; tokensOut: number } | null = null;
  let planFideliteRef: { appels: number; tokensIn: number; tokensOut: number } | null = null;

  for (const f of finalistes()) {
    const e = estimerColonne(fige, f, JUGE_PRINCIPAL);
    if (!planGenerationRef) {
      planGenerationRef = e.generation;
      planFideliteRef = e.fidelite;
    }
    coutTotalCampagne += e.coutTotal;
    const prix = `${f.prixInParM}/${f.prixOutParM}`;
    const g = `${e.generation.appels.toString().padStart(3)} / ${e.generation.tokensIn.toString().padStart(6)} / ${e.generation.tokensOut.toString().padStart(6)}`;
    const j = `${e.fidelite.appels.toString().padStart(3)} / ${e.fidelite.tokensIn.toString().padStart(6)} / ${e.fidelite.tokensOut.toString().padStart(6)}`;
    console.info(
      `| ${f.nom.padEnd(20)} | ${prix.padStart(14)} | ${g.padEnd(32)} | ${j.padEnd(32)} | ${e.coutTotal.toFixed(4).padStart(6)} $ |`,
    );
  }
  console.info();
  console.info(
    `**Total campagne 2** : ~${coutTotalCampagne.toFixed(4)} $ (${finalistes().length} finalistes × génération + fidélité Haiku).`,
  );
  console.info();
  if (planGenerationRef && planFideliteRef) {
    console.info(
      `Le coût du juge de fidélité est identique pour chaque colonne (juge sur les questions rendues par la colonne — même nombre d'appels par concept).`,
    );
    console.info(
      `Génération : **${planGenerationRef.appels} appels** par colonne (concepts groupés par 3).`,
    );
    console.info(
      `Fidélité   : **${planFideliteRef.appels} appels** par colonne (un par concept qui a des questions).`,
    );
  }
  console.info();
  console.info(
    `Garde-fou 2× (par colonne) — arrêt sec si le coût réel dépasse le double de l'estimation.`,
  );
  console.info(
    `Marge d'erreur ~20 % (tokens estimés chars/4). Facture réelle sur OpenRouter à l'émission.`,
  );
}

main().catch((erreur: unknown) => {
  console.error("Le plan à sec s'est interrompu.", erreur);
  process.exitCode = 1;
});
