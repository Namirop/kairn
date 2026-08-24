import "dotenv/config";

/**
 * Deux modes :
 *
 *   npm run verifier:openrouter                 # vérifie CHALLENGERS + JUGES_CANDIDATS
 *   npm run verifier:openrouter -- --lister     # liste le catalogue OpenRouter
 *
 * En mode `--lister` : ne filtre que les modèles qui supportent les sorties
 * structurées, coupe au-dessus du prix de sortie de Sonnet 5 (la référence),
 * trie par prix de sortie croissant, rend fournisseur + identifiant exact +
 * prix in/out. C'est la liste depuis laquelle le pilote désigne les quatre
 * challengers et le juge candidat.
 *
 * L'endpoint `/models` est gratuit et documentaire — aucun des deux modes ne
 * consomme de solde.
 */

async function main(): Promise<void> {
  const cle = process.env.OPENROUTERAI_KEY?.trim();
  if (!cle) {
    console.error("OPENROUTERAI_KEY absente de l'environnement.");
    process.exit(1);
  }

  if (process.argv.includes("--lister")) {
    await lister();
    return;
  }

  await verifier();
}

async function verifier(): Promise<void> {
  const { CHALLENGERS, JUGES_CANDIDATS } = await import("./evaluation/openrouter/modeles");
  const { verifierLeListing } = await import("./evaluation/openrouter/verification");

  const tous = [...CHALLENGERS, ...JUGES_CANDIDATS];
  if (tous.length === 0) {
    console.info("CHALLENGERS et JUGES_CANDIDATS sont vides — rien à vérifier.");
    console.info("Lance `npm run verifier:openrouter -- --lister` pour voir le catalogue.");
    return;
  }
  const s = JUGES_CANDIDATS.length > 1 ? "s" : "";
  console.info(
    `Vérification de ${tous.length} modèles sur OpenRouter — ${CHALLENGERS.length} challengers, ${JUGES_CANDIDATS.length} juge${s} candidat${s}.`,
  );

  const refus = await verifierLeListing(tous);

  if (refus.length === 0) {
    console.info(
      "Tous les modèles sont conformes : identifiants trouvés, sorties structurées supportées, prix catalogue à moins de 5 % de la fiche.",
    );
    return;
  }

  console.error(`\n${refus.length} refus :\n`);
  for (const { modele, motif } of refus) {
    console.error(`  ✗ ${modele.nom} (${modele.id}) — ${motif}`);
  }
  process.exit(1);
}

/** Les variantes qu'on écarte de la liste : `:free` (rate limité, incomparable),
 * `:batch` (latence à plusieurs heures), `:beta` (versions en changement), et
 * les auto-routers d'OpenRouter (`openrouter/auto…`, prix rendu négatif). */
const TAGS_ECARTES = [":free", ":batch", ":beta"];
function esVariantePratique(id: string): boolean {
  if (id.startsWith("openrouter/auto")) return false;
  return !TAGS_ECARTES.some((tag) => id.endsWith(tag));
}

async function lister(): Promise<void> {
  const { lireLeCatalogue } = await import("./evaluation/openrouter/catalogue");
  const { REFERENCE } = await import("./evaluation/openrouter/modeles");

  const catalogue = await lireLeCatalogue();
  const eligibles = catalogue
    .filter((m) => m.supporteSortiesStructurees)
    .filter((m) => m.prixInParM >= 0 && m.prixOutParM >= 0)
    .filter((m) => esVariantePratique(m.id))
    .filter((m) => m.prixOutParM <= REFERENCE.prixOutParM && m.prixInParM <= REFERENCE.prixInParM)
    .sort((a, b) => a.prixOutParM - b.prixOutParM);

  const largeurFournisseur = Math.max(12, ...eligibles.map((m) => m.fournisseur.length));
  const largeurId = Math.max(20, ...eligibles.map((m) => m.id.length));

  console.info(
    `Catalogue OpenRouter — sorties structurées supportées, prix in ≤ ${REFERENCE.prixInParM} $ et out ≤ ${REFERENCE.prixOutParM} $ par million (référence : ${REFERENCE.nom}).`,
  );
  console.info(
    `Écartés : \`:free\`, \`:batch\`, \`:beta\` et auto-routers. Trié par prix de sortie croissant. ${eligibles.length} modèles.\n`,
  );

  const enTete = `${"Fournisseur".padEnd(largeurFournisseur)}  ${"Identifiant".padEnd(largeurId)}  ${"in $/M".padStart(8)}  ${"out $/M".padStart(8)}`;
  console.info(enTete);
  console.info("-".repeat(enTete.length));

  for (const m of eligibles) {
    console.info(
      `${m.fournisseur.padEnd(largeurFournisseur)}  ${m.id.padEnd(largeurId)}  ${m.prixInParM.toFixed(2).padStart(8)}  ${m.prixOutParM.toFixed(2).padStart(8)}`,
    );
  }
}

main().catch((erreur: unknown) => {
  console.error("La vérification s'est interrompue.", erreur);
  process.exitCode = 1;
});
