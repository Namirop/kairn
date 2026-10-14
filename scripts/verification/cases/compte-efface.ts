import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db/client";
import { exporterLeCompte, supprimerLeCompte } from "@/lib/db/compte";
import { compterLePassage } from "@/lib/db/progression";
import { enregistrerRevision } from "@/lib/db/revision";
import { signalerUneQuestion } from "@/lib/db/signalement";
import { compterConceptsRetenus } from "@/lib/db/comptage-de-la-periode";
import { reserverDepot } from "@/lib/db/quota-depots";
import { fabriquerConcept } from "./abus-fabrique";
import { noter } from "./journal";

/**
 * Ce qu'il reste d'un compte effacé. La suppression repose sur les cascades du
 * schéma : une table neuve avec un `userId` et un mauvais `onDelete` laisserait
 * survivre des données personnelles sans que rien ne le dise. La liste des
 * tables est donc relue dans le schéma à chaque exécution.
 */

/**
 * Les tables qui survivent volontairement, lien vers l'auteur mis à nul : un
 * appel payé reste en comptabilité, un signalement et un retour portent un
 * défaut du produit, pas une identité. La capture d'un retour, elle, est
 * effacée (voir `supprimerLeCompte`).
 */
const DETACHES = new Set(["AiCall", "Retour", "Signalement"]);

/** Les modèles qui portent un `userId`, tels que le schéma les déclare. */
function modelesAvecUserId(): { nom: string; cascade: boolean }[] {
  const dossier = "prisma/schema";
  const schema = readdirSync(dossier)
    .filter((fichier) => fichier.endsWith(".prisma"))
    .map((fichier) => readFileSync(join(dossier, fichier), "utf8"))
    .join("\n");

  const modeles: { nom: string; cascade: boolean }[] = [];

  for (const bloc of schema.split(/\bmodel\s+/).slice(1)) {
    const nom = bloc.slice(0, bloc.indexOf(" ")).trim();
    const corps = bloc.slice(0, bloc.indexOf("\n}"));

    if (!/^\s*userId\s/m.test(corps)) continue;

    modeles.push({ nom, cascade: !DETACHES.has(nom) });
  }

  return modeles;
}

/**
 * Combien de lignes de cette table portent encore ce compte. En SQL brut parce
 * que les tables sont découvertes à l'exécution : le client typé exigerait une
 * assertion de type. Les noms viennent du schéma du dépôt, jamais d'une entrée.
 */
async function compterPour(table: string, userId: string): Promise<number> {
  const lignes = await prisma.$queryRawUnsafe<{ lignes: bigint }[]>(
    `SELECT count(*)::bigint AS lignes FROM "${table}" WHERE "userId" = $1`,
    userId,
  );

  return Number(lignes[0]?.lignes ?? 0n);
}

/**
 * Le libellé du concept fabriqué ici. Le signalement de ce cas survit exprès à
 * la suppression du compte, donc à la vérification : le nettoyage final de
 * `verifier-session.ts` le retrouve par ce libellé, sinon chaque exécution en
 * laisserait un orphelin dans l'écran d'administration.
 */
export const CONCEPT_EFFACE = "Un concept à effacer";

/** Un compte qui a vécu : dépôt, concepts, passages, progression, signalement. */
async function compteRempli(userId: string, fuseau: string): Promise<void> {
  await reserverDepot(userId, fuseau);
  await compterConceptsRetenus(userId, fuseau, 3);

  const concept = await fabriquerConcept(userId, { libelle: CONCEPT_EFFACE });

  await enregistrerRevision({
    userId,
    atomId: concept.atomId,
    variantId: concept.variantIds[0] ?? "",
    note: "GOOD",
    tempsMs: 3000,
    maitrise: false,
  });
  await compterLePassage({
    userId,
    ratePrecedemment: false,
    reussiMaintenant: true,
    fuseau,
    echeanceAvant: new Date(),
  });
  await signalerUneQuestion({
    userId,
    variantId: concept.variantIds[1] ?? "",
    motif: "FAUSSE",
    commentaire: null,
  });
}

export async function casSuppressionComplete(userId: string, fuseau: string): Promise<void> {
  await compteRempli(userId, fuseau);

  const modeles = modelesAvecUserId();
  const avant: Record<string, number> = {};

  for (const modele of modeles) {
    avant[modele.nom] = await compterPour(modele.nom, userId);
  }

  const remplies = modeles.filter((modele) => (avant[modele.nom] ?? 0) > 0).map((m) => m.nom);

  noter(
    "Suppression — le compte de vérification a bien vécu avant d'être effacé",
    remplies.length >= 6,
    `${remplies.length} table(s) remplies : ${remplies.join(", ")}`,
  );

  const efface = await supprimerLeCompte(userId);
  const survivants: string[] = [];

  for (const modele of modeles.filter((candidat) => candidat.cascade)) {
    const restant = await compterPour(modele.nom, userId);

    if (restant > 0) survivants.push(`${modele.nom} (${restant})`);
  }

  noter(
    `Suppression — aucune des ${modeles.length - DETACHES.size} tables du compte ne survit`,
    efface && survivants.length === 0,
    survivants.length === 0
      ? `${modeles.length - DETACHES.size} table(s) vérifiées, relues dans le schéma`
      : `restent : ${survivants.join(", ")}`,
  );

  // Les tables qui survivent doivent survivre détachées : un `userId` restant
  // serait une donnée personnelle orpheline.
  const rattachees: string[] = [];

  for (const modele of modeles.filter((candidat) => !candidat.cascade)) {
    const restant = await compterPour(modele.nom, userId);

    if (restant > 0) rattachees.push(`${modele.nom} (${restant})`);
  }

  const signalements = await prisma.signalement.count();

  noter(
    "Suppression — la comptabilité et les signalements restent, mais détachés",
    rattachees.length === 0 && signalements > 0,
    rattachees.length === 0
      ? `${signalements} signalement(s) conservés, plus aucun lien vers le compte`
      : `encore rattachées : ${rattachees.join(", ")}`,
  );

  noter(
    "Suppression — un compte effacé n'a plus rien à exporter",
    (await exporterLeCompte(userId)) === null,
    "export refusé",
  );
}

export async function casExportComplet(userId: string, fuseau: string): Promise<void> {
  await compteRempli(userId, fuseau);

  const donnees = await exporterLeCompte(userId);
  const concepts = donnees?.depots.flatMap((depot) => depot.concepts) ?? [];

  noter(
    "Export — il porte les dépôts, les concepts, leurs questions et les passages",
    donnees !== null &&
      donnees.depots.length > 0 &&
      concepts.length > 0 &&
      concepts.some((concept) => concept.questions.length > 0) &&
      concepts.some((concept) => concept.passages.length > 0),
    `${donnees?.depots.length ?? 0} dépôt(s), ${concepts.length} concept(s), ` +
      `${concepts.reduce((somme, c) => somme + c.questions.length, 0)} question(s), ` +
      `${concepts.reduce((somme, c) => somme + c.passages.length, 0)} passage(s)`,
  );

  noter(
    "Export — il porte la progression et l'identité du compte",
    donnees?.progression !== null &&
      (donnees?.progression?.xp ?? 0) > 0 &&
      (donnees?.compte.email ?? "").length > 0,
    `${donnees?.progression?.xp ?? 0} XP, niveau ${donnees?.progression?.niveau ?? 0}`,
  );

  // Un export qu'on ne peut pas relire n'exerce aucun droit : il doit survivre
  // à un aller-retour JSON.
  const relu: unknown = JSON.parse(JSON.stringify(donnees));

  noter(
    "Export — il se relit tel quel, sans identifiant interne",
    JSON.stringify(relu) === JSON.stringify(donnees) &&
      !JSON.stringify(donnees).includes('"userId"') &&
      !JSON.stringify(donnees).includes('"atomId"'),
    "relisible, aucun identifiant technique",
  );
}
