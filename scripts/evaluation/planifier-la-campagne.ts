import "dotenv/config";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  PAIRES_PAR_APPEL,
  ajouterPlans,
  couterPlan,
  planAttendus,
  planDoublon,
  planExtraction,
  planResidu,
  type Plan,
  type VerdictsFige,
} from "./campagne/plan";
import { lireCorpus } from "./corpus";
import { dernierFige, lireFige } from "./fige";
import { BANDEAU_DE_CAMPAGNE, BUDGET_SORTIE_CAMPAGNE } from "./openrouter/campagne";
import { CHALLENGERS, JUGE_PRINCIPAL, REFERENCE } from "./openrouter/modeles";

/**
 * Campagne close, sans commande : voir `docs/outillage.md`, « Les commandes
 * retirées ».
 *
 * Le plan à sec de la campagne 1 : extraction des challengers sur le corpus,
 * plus les juges Haiku (doublon, résidu, attendus) sur leurs concepts. Aucun
 * appel modèle : il lit le figé Sonnet `11h58` et ses verdicts, Sonnet
 * servant de proxy du volume à produire.
 *
 * - La référence Sonnet n'est pas rejouée : le figé `11h58` vaut tel quel, et
 *   c'est pour ça que Haiku reste juge.
 * - Un seul budget de sortie pour tous, celui de Sonnet : un modèle qui déborde
 *   compte comme échec de schéma, on ne lui monte pas le plafond.
 * - Pas de juge de fidélité : il mesure les questions, et ce passage n'en
 *   génère pas.
 *
 * Quatre signes par token en français : ~20 % d'erreur, assez pour un plan.
 * L'estimation elle-même vit dans `campagne/plan.ts` ; ce script la lit et
 * l'affiche.
 */

function ligne(nom: string, prix: string, extraction: Plan, juges: Plan, cout: string): string {
  const total = ajouterPlans(extraction, juges);
  return `| ${nom.padEnd(22)} | ${prix.padStart(13)} | ${extraction.appels.toString().padStart(3)} / ${extraction.tokensIn.toString().padStart(6)} / ${extraction.tokensOut.toString().padStart(6)} | ${juges.appels.toString().padStart(3)} / ${juges.tokensIn.toString().padStart(6)} / ${juges.tokensOut.toString().padStart(6)} | ${total.appels.toString().padStart(4)} | ${cout.padStart(6)} $ |`;
}

function afficherLesRappels(): void {
  console.info("# Plan à sec — campagne 1\n");
  console.info(BANDEAU_DE_CAMPAGNE);
  console.info();
  console.info("## Rappels non négociables\n");
  console.info("- La colonne de référence Sonnet n'est pas rejouée (figé `11h58` valide).");
  console.info(
    `- Budget de sortie unique : **${BUDGET_SORTIE_CAMPAGNE} tokens**, même barre pour tous. Débordement = échec de schéma.`,
  );
  console.info("- Pas de génération de questions à ce passage, donc pas de juge de fidélité.");
  console.info();
}

function afficherLePerimetre(
  nbDepots: number,
  cheminFige: string,
  verdicts: VerdictsFige,
  plans: { doublon: Plan; residu: Plan; attendus: Plan },
): void {
  const { doublon, residu, attendus } = plans;
  console.info(`## Périmètre lu`);
  console.info(
    `- Corpus : ${nbDepots} dépôts (${cheminFige.split(/[\\/]/).slice(-2).join("/")} comme proxy).`,
  );
  console.info(`- Signalements Sonnet (par colonne challenger) :`);
  console.info(
    `  · doublon — ${doublon.appels} appels sur ${nbAppelsDoublonDeptCorpus(verdicts)} dépôts, ${totalPaires(verdicts)} paires réparties en lots de ${PAIRES_PAR_APPEL} max`,
  );
  console.info(
    `  · résidu — ${residu.appels} appels sur ${residu.appels} dépôts, ${totalItemsResidu(verdicts)} items`,
  );
  console.info(
    `  · attendus — ${attendus.appels} appels sur ${attendus.appels} dépôts, ${totalAttendus(verdicts)} attendus`,
  );
  console.info();
}

function afficherLesCouts(extraction: Plan, juges: Plan): void {
  console.info(`## Coût estimé par colonne\n`);
  console.info(
    `| Colonne                | Prix in/out   | Extraction  A / in / out    | Juges Haiku A / in / out | Appels | Coût   |`,
  );
  console.info(
    `|:-----------------------|-------------:|:-----------------------------|:--------------------------|-------:|-------:|`,
  );

  const prixRef = `${REFERENCE.prixInParM}/${REFERENCE.prixOutParM}`;
  console.info(
    ligne(
      REFERENCE.nom + " (référence)",
      prixRef,
      { appels: 0, tokensIn: 0, tokensOut: 0 },
      { appels: 0, tokensIn: 0, tokensOut: 0 },
      "0.0000",
    ),
  );
  console.info(`| ↑ non rejouée — figé \`11h58\` valide, colonne déjà payée. |||||||`);

  let coutTotalCampagne = 0;
  for (const c of CHALLENGERS) {
    const prix = `${c.prixInParM}/${c.prixOutParM}`;
    const coutExtraction = couterPlan(extraction, c);
    const coutJuges = couterPlan(juges, JUGE_PRINCIPAL);
    const coutColonne = coutExtraction + coutJuges;
    coutTotalCampagne += coutColonne;
    console.info(ligne(c.nom, prix, extraction, juges, coutColonne.toFixed(4)));
  }
  console.info();
  console.info(
    `**Total campagne 1** : ~${coutTotalCampagne.toFixed(2)} $ (4 challengers × extraction + ${juges.appels} appels Haiku via OpenRouter par colonne).`,
  );
  console.info();
  console.info(
    `Le coût des juges est identique pour chaque colonne (${couterPlan(juges, JUGE_PRINCIPAL).toFixed(4)} $/colonne), l'extraction seule dépend du prix du challenger.`,
  );
  console.info();
  console.info(
    `Marge d'erreur ~20 % (tokens estimés en chars/4). La facture réelle se lira sur OpenRouter, dépôt par dépôt, à l'émission.`,
  );
}

async function main(): Promise<void> {
  afficherLesRappels();

  const cheminFige = dernierFige();
  if (!cheminFige) throw new Error("Aucun figé disponible.");
  const fige = lireFige(cheminFige);
  const cheminVerdicts = join(dirname(cheminFige), "..", "verdicts", basename(cheminFige));
  const verdicts: VerdictsFige = JSON.parse(readFileSync(cheminVerdicts, "utf8"));

  const corpus = lireCorpus();
  const extraction = planExtraction(corpus, fige);
  const doublon = planDoublon(fige, verdicts);
  const residu = planResidu(fige, verdicts);
  const attendus = planAttendus(verdicts);
  const juges = ajouterPlans(ajouterPlans(doublon, residu), attendus);

  afficherLePerimetre(corpus.length, cheminFige, verdicts, { doublon, residu, attendus });
  afficherLesCouts(extraction, juges);
}

function totalPaires(verdicts: VerdictsFige): number {
  return Object.values(verdicts.depots).reduce((s, d) => s + (d.doublons?.length ?? 0), 0);
}

function totalItemsResidu(verdicts: VerdictsFige): number {
  return Object.values(verdicts.depots).reduce(
    (s, d) => s + (d.residu?.manques.length ?? 0) + (d.residu?.inventions.length ?? 0),
    0,
  );
}

function totalAttendus(verdicts: VerdictsFige): number {
  return Object.values(verdicts.depots).reduce((s, d) => s + (d.attendus?.length ?? 0), 0);
}

function nbAppelsDoublonDeptCorpus(verdicts: VerdictsFige): number {
  return Object.values(verdicts.depots).filter((d) => (d.doublons?.length ?? 0) > 0).length;
}

main().catch((erreur: unknown) => {
  console.error("Le plan à sec s'est interrompu.", erreur);
  process.exitCode = 1;
});
