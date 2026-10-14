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
import { record } from "./journal";

/**
 * Ce qu'il reste d'un compte effacé, et ce qu'il ne doit plus rester.
 *
 * La suppression tient dans une seule instruction : ce sont les cascades du
 * schéma qui font le travail. C'est exactement pour ça qu'elle mérite une
 * vérification — le jour où une table s'ajoute avec un `userId` et un
 * `onDelete` mal choisi, rien ne le dira, et des données personnelles
 * survivront à une demande d'effacement.
 *
 * La liste des tables n'est donc pas écrite ici : elle est **relue dans le
 * schéma** à chaque exécution. Une table neuve entre dans la vérification sans
 * que personne n'ait à y penser.
 */

/**
 * Les trois tables qui survivent volontairement, détachées de leur auteur.
 *
 * La comptabilité d'un appel déjà payé ne s'efface pas avec la personne qui l'a
 * déclenché ; un signalement porte une question à corriger et non une identité ;
 * un retour porte un défaut du produit, et l'effacer avec le compte perdrait le
 * travail restant au moment même où quelqu'un part. Dans les trois cas le lien
 * tombe à nul — c'est ce que la vérification exige.
 *
 * La capture d'un retour, elle, est effacée avant la suppression. Voir
 * `supprimerLeCompte`.
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
 * Combien de lignes de cette table portent encore ce compte.
 *
 * Le comptage passe par SQL et non par le client typé : les noms de tables sont
 * découverts à l'exécution, et le seul moyen de les adresser par le client
 * serait une assertion de type — que ce projet interdit, à raison. Les noms
 * viennent du schéma du dépôt et jamais d'une entrée : il n'y a rien à injecter
 * ici, seulement une table dont on ignorait le nom en écrivant ce fichier.
 */
async function compterPour(table: string, userId: string): Promise<number> {
  const lignes = await prisma.$queryRawUnsafe<{ lignes: bigint }[]>(
    `SELECT count(*)::bigint AS lignes FROM "${table}" WHERE "userId" = $1`,
    userId,
  );

  return Number(lignes[0]?.lignes ?? 0n);
}

/**
 * Le libellé du concept que ce cas fabrique, et la seule prise qu'on ait sur ce
 * qu'il laisse derrière lui.
 *
 * Le signalement écrit ici **survit volontairement** à la suppression du compte
 * — c'est ce que le cas vérifie. Mais survivre à la suppression du compte veut
 * dire survivre à la vérification elle-même : chaque exécution en abandonnait un
 * de plus, détaché de tout, et l'écran d'administration a fini par en compter
 * vingt-six qui ne venaient de personne. Le nettoyage final s'appuie sur ce
 * libellé, et rattrape donc aussi ceux des exécutions passées.
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

  record(
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

  record(
    `Suppression — aucune des ${modeles.length - DETACHES.size} tables du compte ne survit`,
    efface && survivants.length === 0,
    survivants.length === 0
      ? `${modeles.length - DETACHES.size} table(s) vérifiées, relues dans le schéma`
      : `restent : ${survivants.join(", ")}`,
  );

  // Les deux qui survivent doivent survivre **détachées** : une ligne qui garde
  // le `userId` d'un compte effacé serait une donnée personnelle orpheline.
  const rattachees: string[] = [];

  for (const modele of modeles.filter((candidat) => !candidat.cascade)) {
    const restant = await compterPour(modele.nom, userId);

    if (restant > 0) rattachees.push(`${modele.nom} (${restant})`);
  }

  const signalements = await prisma.signalement.count();

  record(
    "Suppression — la comptabilité et les signalements restent, mais détachés",
    rattachees.length === 0 && signalements > 0,
    rattachees.length === 0
      ? `${signalements} signalement(s) conservés, plus aucun lien vers le compte`
      : `encore rattachées : ${rattachees.join(", ")}`,
  );

  record(
    "Suppression — un compte effacé n'a plus rien à exporter",
    (await exporterLeCompte(userId)) === null,
    "export refusé",
  );
}

export async function casExportComplet(userId: string, fuseau: string): Promise<void> {
  await compteRempli(userId, fuseau);

  const donnees = await exporterLeCompte(userId);
  const concepts = donnees?.depots.flatMap((depot) => depot.concepts) ?? [];

  record(
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

  record(
    "Export — il porte la progression et l'identité du compte",
    donnees?.progression !== null &&
      (donnees?.progression?.xp ?? 0) > 0 &&
      (donnees?.compte.email ?? "").length > 0,
    `${donnees?.progression?.xp ?? 0} XP, niveau ${donnees?.progression?.niveau ?? 0}`,
  );

  // Un export qu'on ne peut pas relire n'exerce aucun droit : il doit survivre à
  // un aller-retour JSON sans perdre sa forme.
  const relu: unknown = JSON.parse(JSON.stringify(donnees));

  record(
    "Export — il se relit tel quel, sans identifiant interne",
    JSON.stringify(relu) === JSON.stringify(donnees) &&
      !JSON.stringify(donnees).includes('"userId"') &&
      !JSON.stringify(donnees).includes('"atomId"'),
    "relisible, aucun identifiant technique",
  );
}
