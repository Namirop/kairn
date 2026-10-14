import "dotenv/config";
import { join } from "node:path";
import { lireFige } from "./fige";
import type { Facture } from "./openrouter/facture";
import { JUGE_PRINCIPAL, JUGES_CANDIDATS, type ModeleOpenRouter } from "./openrouter/modeles";
import { volet1Doublon, volet2Fidelite } from "./validation-du-juge/volets";

/**
 * Arrêt 1 : validation d'un juge candidat avant campagne (~0,10 $ les douze
 * appels). Campagne close, sans commande : voir `docs/outillage.md`, « Les
 * commandes retirées ».
 *
 * Deux volets contre le figé `2026-08-20-11h58` :
 *
 * 1. Six paires témoins au juge du doublon, contre l'attendu écrit à la main.
 *    Critère : ≥ 5/6, et les deux paires non indépendantes (15, 16) sont
 *    obligatoires : ces jumeaux sont ce que la géométrie ne sait pas trancher,
 *    donc la raison d'être du juge.
 *
 * 2. Six lots au juge de la fidélité : deux propres (04, 18), deux portant des
 *    infidèles connues, deux moyens. Critère : accord ≥ 80 % par question avec
 *    les verdicts Haiku, aucun faux positif sur les propres — un KO inventé
 *    dégrade la fidélité mesurée sans rattrapage possible en aval.
 *
 *   npx tsx scripts/evaluation/valider-le-juge.ts                     # JUGE_PRINCIPAL
 *   npx tsx scripts/evaluation/valider-le-juge.ts -- --candidat=<id>  # un de JUGES_CANDIDATS
 *
 * Un nouveau candidat se déclare d'abord comme constante dans `modeles.ts`.
 */

const FIGE = join(import.meta.dirname, "concepts", "2026-08-20-11h58.json");

function totaux(factures: Facture[]): { in: number; out: number; usd: number; ms: number } {
  return factures.reduce(
    (acc, f) => ({
      in: acc.in + f.inputTokens,
      out: acc.out + f.outputTokens,
      usd: acc.usd + f.coutUsd,
      ms: acc.ms + f.latencyMs,
    }),
    { in: 0, out: 0, usd: 0, ms: 0 },
  );
}

function choisirJuge(): ModeleOpenRouter {
  const arg = process.argv.find((a) => a.startsWith("--candidat="));
  if (!arg) return JUGE_PRINCIPAL;
  const id = arg.slice("--candidat=".length).trim();
  const trouve = JUGES_CANDIDATS.find((m) => m.id === id);
  if (!trouve) {
    throw new Error(
      `Identifiant inconnu : « ${id} ». Ajoute une constante dans scripts/evaluation/openrouter/modeles.ts avant de lancer la validation.`,
    );
  }
  return trouve;
}

async function main(): Promise<void> {
  const juge: ModeleOpenRouter = choisirJuge();
  console.info(`# Arrêt 1 — validation du juge candidat : ${juge.nom} (${juge.id})`);
  console.info(
    `Prix catalogue : ${juge.prixInParM} $ in / ${juge.prixOutParM} $ out par million de tokens.`,
  );

  const fige = lireFige(FIGE);
  const doublon = await volet1Doublon(fige, juge);
  const fidelite = await volet2Fidelite(fige, juge);

  const factures = [...doublon.factures, ...fidelite.factures];
  const tot = totaux(factures);
  console.info(
    `\n## Facture — ${factures.length} appels, ${tot.in} tokens in, ${tot.out} tokens out, ${tot.usd.toFixed(4)} $ (${tot.ms} ms cumulés)`,
  );

  const valide = doublon.passe && fidelite.passe;
  console.info(
    `\n## Conclusion — ${valide ? "juge VALIDÉ" : "juge NON VALIDÉ"} : doublon ${
      doublon.passe ? "passe" : "échoue"
    }, fidélité ${fidelite.passe ? "passe" : "échoue"}.`,
  );
  if (!valide) process.exitCode = 1;
}

main().catch((erreur: unknown) => {
  console.error("Validation interrompue.", erreur);
  process.exitCode = 1;
});
