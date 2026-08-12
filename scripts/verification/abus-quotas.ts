import { readFileSync } from "node:fs";
import { prisma } from "@/lib/db/client";
import {
  CONCEPTS_PAR_JOUR,
  DEPOTS_PAR_JOUR,
  compterConceptsRetenus,
  lireUsageDuJour,
} from "@/lib/db/quota-depots";
import { deposer, SIGNES_MAXIMUM, type ResultatDepot } from "@/lib/depots/deposer";
import { MOTIFS_DE_REFUS } from "@/lib/depots/refus-de-quota";
import { GESTES_PAR_FENETRE, prendreUnGeste } from "@/lib/db/limite-de-gestes";
import { enregistrerEntrainement } from "@/lib/db/entrainement";
import { dayToUtcDate, localDay } from "@/lib/domain/local-day";
import { executerToutLePipeline, formulaire } from "./depot-simule";
import { fabriquerConcept, viderLeCompte } from "./abus-fabrique";
import { record } from "./journal";

/**
 * Les quotas d'ingestion : l'atomicité, le moment du décompte, ce qui revient
 * au compteur et ce qui n'en revient jamais.
 *
 * Le fuseau est celui du compte de vérification, et il ne bouge pas : ce qui
 * est éprouvé ici, ce sont les compteurs, pas le calendrier.
 */

const FUSEAU = "Europe/Paris";
const DEBIT_PAR_FENETRE = 3;
const SIMULTANES = 10;

const PARAGRAPHE = `Une requête HTTP conditionnelle envoie \`If-None-Match\` avec l'étiquette reçue à la
réponse précédente. Le serveur compare, et répond 304 sans corps quand la ressource n'a pas changé.
Le navigateur sert alors sa copie, ce qui économise la bande passante mais pas l'aller-retour. Un
\`Cache-Control: immutable\` supprime cet aller-retour, au prix d'une empreinte dans l'URL.`;

/** Assez long pour que la fixture rende huit concepts, comme un article collé. */
const ARTICLE = Array.from({ length: 6 }, () => PARAGRAPHE).join("\n\n");

function jourDuCompte(): Date {
  return dayToUtcDate(localDay(new Date(), FUSEAU));
}

async function poserLesDepotsDuJour(userId: string, generations: number): Promise<void> {
  await prisma.dailyUsage.upsert({
    where: { userId_day: { userId, day: jourDuCompte() } },
    create: { userId, day: jourDuCompte(), generations, concepts: 0, reviews: 0 },
    update: { generations },
  });
}

function enParallele(userId: string, prefixe: string): Promise<ResultatDepot>[] {
  return Array.from({ length: SIMULTANES }, (_, rang) =>
    deposer(userId, formulaire({ texte: PARAGRAPHE, cleEnvoi: `${prefixe}-${rang}` })),
  );
}

/** La fenêtre courte, éprouvée par dix envois qui partent ensemble. */
export async function casDebitConcurrent(userId: string): Promise<void> {
  await viderLeCompte(userId);

  const resultats = await Promise.all(enParallele(userId, "verif-debit-simultane"));
  const acceptes = resultats.filter((resultat) => resultat.ok).length;

  record(
    `Débit — ${SIMULTANES} dépôts simultanés ne dépassent pas les ${DEBIT_PAR_FENETRE} de la fenêtre`,
    acceptes <= DEBIT_PAR_FENETRE,
    `${acceptes} dépôt(s) acceptés d'un coup`,
  );
}

/** Le plafond de dépôts du jour, éprouvé sur les deux dernières places. */
export async function casPlafondConcurrent(userId: string): Promise<void> {
  await viderLeCompte(userId);
  await poserLesDepotsDuJour(userId, DEPOTS_PAR_JOUR - 2);

  const resultats = await Promise.all(enParallele(userId, "verif-plafond-simultane"));
  const acceptes = resultats.filter((resultat) => resultat.ok).length;
  const usage = await lireUsageDuJour(userId, FUSEAU);

  record(
    `Quota — ${SIMULTANES} dépôts simultanés sur deux places libres n'en prennent que deux`,
    acceptes === 2 && usage.depots === DEPOTS_PAR_JOUR,
    `${acceptes} accepté(s), compteur à ${usage.depots}/${DEPOTS_PAR_JOUR}`,
  );
}

/** Le décompte des concepts a lieu après l'extraction, faute de savoir avant. */
export async function casDecompteApresExtraction(userId: string): Promise<void> {
  await viderLeCompte(userId);
  await compterConceptsRetenus(userId, FUSEAU, CONCEPTS_PAR_JOUR - 1);

  const depot = await deposer(
    userId,
    formulaire({ texte: ARTICLE, cleEnvoi: "verif-debordement" }),
  );

  if (!depot.ok) throw new Error(`Le dernier dépôt aurait dû passer : ${depot.motif}`);

  await executerToutLePipeline(depot.inputId);

  const usage = await lireUsageDuJour(userId, FUSEAU);
  const ecrits = await prisma.atom.count({ where: { inputId: depot.inputId } });

  // Le débordement du dernier dépôt est assumé : refuser à mi-extraction serait
  // pire, et réserver une estimation refuserait un dépôt d'une ligne parce
  // qu'un article aurait pu tenir à sa place. Ce qui doit tenir, c'est qu'aucun
  // dépôt ne parte au-delà, et que le chiffre annoncé se donne pour approximatif.
  const suivant = await deposer(
    userId,
    formulaire({ texte: PARAGRAPHE, cleEnvoi: "verif-apres-debordement" }),
  );

  record(
    "Quota — passé le plafond de concepts, plus aucun dépôt ne part",
    !suivant.ok && suivant.quota === true,
    suivant.ok
      ? "accepté"
      : `${ecrits} concept(s) sur la dernière place, compteur à ${usage.concepts}/${CONCEPTS_PAR_JOUR} — puis « ${suivant.motif} »`,
  );

  record(
    "Quota — le plafond s'annonce pour ce qu'il est, approximatif",
    MOTIFS_DE_REFUS.concepts.includes("autour de"),
    MOTIFS_DE_REFUS.concepts,
  );

  const avant = usage.concepts;
  await prisma.input.delete({ where: { id: depot.inputId } });
  const apres = await lireUsageDuJour(userId, FUSEAU);

  record(
    "Quota — supprimer un dépôt ne rend jamais ce qu'il a consommé",
    apres.concepts === avant && apres.depots > 0,
    `${apres.concepts} concept(s) et ${apres.depots} dépôt(s) toujours comptés`,
  );
}

/**
 * Le point qui décide de tout : un dépôt qui n'a rien donné, pour quelle raison.
 *
 * Rejet — le modèle a lu et conclu qu'il n'y avait rien à retenir. L'appel a
 * été facturé : l'unité « dépôt » est due, les concepts non. Panne — timeout,
 * sortie invalide, plafond global atteint. L'utilisateur n'y est pour rien, et
 * lui facturer une panne du produit est le plus sûr moyen de le perdre : tout
 * doit lui revenir, l'unité « dépôt » comprise.
 *
 * Les deux fins sont bien distinctes en base — `REJECTED` et `FAILED`. Reste à
 * savoir si le compteur les distingue.
 */
export async function casRejetEtPanne(userId: string): Promise<void> {
  await viderLeCompte(userId);

  const rejete = await deposer(
    userId,
    formulaire({
      texte: "Lentilles corail, tomates pelées, pain de seigle, deux citrons.",
      cleEnvoi: "verif-rejet",
    }),
  );

  if (!rejete.ok) throw new Error(`Le dépôt rejeté aurait dû être écrit : ${rejete.motif}`);

  await executerToutLePipeline(rejete.inputId);

  const apresRejet = await lireUsageDuJour(userId, FUSEAU);
  const etatRejet = await prisma.input.findUniqueOrThrow({
    where: { id: rejete.inputId },
    select: { status: true },
  });

  record(
    "Rejet — le dépôt est bien reconnu comme un rejet, pas comme une panne",
    etatRejet.status === "REJECTED",
    etatRejet.status,
  );

  record(
    "Rejet — l'unité « dépôt » est consommée, aucun concept ne l'est",
    apresRejet.depots === 1 && apresRejet.concepts === 0,
    `${apresRejet.depots} dépôt(s), ${apresRejet.concepts} concept(s)`,
  );

  const enPanne = await deposer(userId, formulaire({ texte: ARTICLE, cleEnvoi: "verif-panne" }));

  if (!enPanne.ok) throw new Error(`Le dépôt en panne aurait dû être écrit : ${enPanne.motif}`);

  process.env.AI_ENABLED = "false";
  await executerToutLePipeline(enPanne.inputId);
  process.env.AI_ENABLED = "true";

  const apresPanne = await lireUsageDuJour(userId, FUSEAU);
  const etatPanne = await prisma.input.findUniqueOrThrow({
    where: { id: enPanne.inputId },
    select: { status: true },
  });

  record(
    "Panne — le dépôt est bien reconnu comme un échec technique",
    etatPanne.status === "FAILED",
    etatPanne.status,
  );

  record(
    "Panne — l'unité « dépôt » est rendue : on ne facture pas sa propre panne",
    apresPanne.depots === apresRejet.depots,
    `${apresPanne.depots} dépôt(s) comptés après la panne, contre ${apresRejet.depots} avant`,
  );

  record(
    "Décompte — le compteur distingue un rejet d'un échec technique",
    apresPanne.depots === apresRejet.depots,
    apresPanne.depots === apresRejet.depots
      ? "les deux fins sont comptées différemment"
      : "les deux fins consomment la même place, la raison n'est jamais lue",
  );
}

/**
 * Les gestes de révision, en boucle.
 *
 * Ils ne coûtent aucun appel modèle, et c'est précisément pourquoi personne ne
 * les avait bornés : deux écritures par réponse et un tour d'entraînement qui
 * lisait tout le corpus, répétables autant qu'on voulait. Le quota tient le
 * budget sur la journée, la limite de débit tient le serveur sur la minute.
 */
export async function casGestesEnRafale(userId: string): Promise<void> {
  await viderLeCompte(userId);

  const concept = await fabriquerConcept(userId, { libelle: "Un concept qu'on martèle" });
  const variantId = concept.variantIds[0] ?? "";
  let acceptes = 0;

  // La place d'abord, l'écriture ensuite — l'ordre de la Server Action, qui
  // n'est pas appelable ici puisqu'elle lit une session HTTP. Seul le premier
  // geste écrit vraiment : ce qui est mesuré, c'est la fenêtre, et écrire cent
  // vingt passages ne prouverait rien de plus.
  if (await prendreUnGeste(userId, FUSEAU)) {
    await enregistrerEntrainement({
      userId,
      atomId: concept.atomId,
      variantId,
      note: "GOOD",
      tempsMs: 3000,
    });
    acceptes += 1;
  }

  for (let tour = 1; tour < GESTES_PAR_FENETRE + 20; tour += 1) {
    if (!(await prendreUnGeste(userId, FUSEAU))) break;

    acceptes += 1;
  }

  record(
    `Débit — une boucle de gestes s'arrête à la fenêtre, ${GESTES_PAR_FENETRE} par minute`,
    acceptes === GESTES_PAR_FENETRE,
    `${acceptes} geste(s) acceptés d'affilée`,
  );

  record(
    "Débit — la fenêtre pleine, un geste de plus est refusé quoi qu'il demande",
    !(await prendreUnGeste(userId, FUSEAU)),
    "refusé",
  );

  // Le mécanisme est prouvé ci-dessus ; reste à prouver qu'il est branché. Les
  // trois gestes coûteux doivent le traverser, et une relecture attentive laisse
  // passer ce genre d'oubli — une assertion non.
  const branchees = ["app/(app)/reviser/actions.ts", "app/(app)/entrainement/actions.ts"]
    .map((chemin) => readFileSync(chemin, "utf8"))
    .join("\n");
  const gestes = [
    ["repondreAction", "repondreAction"],
    ["sentrainerAction", "sentrainerAction"],
    ["tourSuivantAction", "tourSuivantAction"],
  ] as const;
  const sansLimite = gestes
    .filter(([, nom]) => {
      const corps = branchees.slice(branchees.indexOf(`export async function ${nom}`));

      return !corps.slice(0, corps.indexOf("\n}")).includes("prendreUnGeste");
    })
    .map(([libelle]) => libelle);

  record(
    "Débit — les trois gestes coûteux passent par la limite",
    sansLimite.length === 0,
    sansLimite.length === 0 ? "les trois la traversent" : `sans limite : ${sansLimite.join(", ")}`,
  );
}

/** Ce qu'on refuse à l'entrée, côté serveur et pas seulement au formulaire. */
export async function casBornesDentree(userId: string): Promise<void> {
  await viderLeCompte(userId);

  const trop = await deposer(
    userId,
    formulaire({ texte: "a".repeat(SIGNES_MAXIMUM + 1), cleEnvoi: "verif-borne-texte" }),
  );

  record(
    `Bornes — un texte de plus de ${SIGNES_MAXIMUM} signes est refusé côté serveur`,
    !trop.ok,
    trop.ok ? "accepté" : trop.motif,
  );

  const vide = await deposer(userId, formulaire({ texte: "   ", cleEnvoi: "verif-borne-vide" }));

  record(
    "Bornes — un dépôt sans texte ni capture est refusé",
    !vide.ok,
    vide.ok ? "accepté" : vide.motif,
  );

  const menteur = new File([new Uint8Array(Buffer.from("<?php echo 1; ?>"))], "capture.png", {
    type: "image/png",
  });
  const faux = await deposer(
    userId,
    formulaire({ texte: "", cleEnvoi: "verif-borne-type" }, menteur),
  );

  record(
    "Bornes — le type d'un fichier est décidé par son contenu, pas par son nom",
    !faux.ok,
    faux.ok ? "accepté" : faux.motif,
  );

  const enorme = new File([new Uint8Array(6 * 1024 * 1024)], "capture.png", { type: "image/png" });
  const lourd = await deposer(
    userId,
    formulaire({ texte: "", cleEnvoi: "verif-borne-taille" }, enorme),
  );

  record(
    "Bornes — une capture de plus de 5 Mo est refusée côté serveur",
    !lourd.ok,
    lourd.ok ? "accepté" : lourd.motif,
  );

  const usage = await lireUsageDuJour(userId, FUSEAU);

  record(
    "Bornes — un dépôt refusé à l'entrée ne consomme aucune place du jour",
    usage.depots === 0 && usage.concepts === 0,
    `${usage.depots} dépôt(s), ${usage.concepts} concept(s)`,
  );
}
