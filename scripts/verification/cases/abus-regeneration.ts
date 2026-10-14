import { prisma } from "@/lib/db/client";
import { lireReservationsDuJour } from "@/lib/db/ai-quota";
import { modifierConcept } from "@/lib/db/concepts";
import { lireDepotDetaille } from "@/lib/db/depot-detaille";
import { regenererSiUsees } from "@/lib/db/regeneration";
import { etatDuDepot } from "@/lib/domain/etat-depot";
import { etatDepot } from "@/lib/i18n/messages/fr/etat-depot";
import { deposer } from "@/lib/depots/deposer";
import { redecouper } from "@/lib/depots/redecouper";
import { runJob } from "@/lib/jobs/runner";
import { FACETTES, enModeCompteur, fabriquerConcept, viderLeCompte } from "./abus-fabrique";
import { executerToutLePipeline, formulaire } from "./depot-simule";
import { record } from "./journal";

/**
 * Les vecteurs de régénération, comptés en appels. Le plafond d'une
 * régénération par concept et par semaine ne tient que si tous les chemins le
 * traversent. Les appels sont comptés au registre sans qu'aucune requête ne
 * sorte : voir `enModeCompteur`.
 */

const TENTATIVES = 20;

/**
 * Assez de places pour que le plafond global n'intervienne pas, posées
 * au-dessus de ce que la journée a déjà pris : le banc d'évaluation dépense
 * réellement sur la même journée UTC.
 */
async function plafondLarge(): Promise<number> {
  return 200 + (await lireReservationsDuJour());
}

/** Un texte assez long pour que la fixture rende plusieurs concepts. */
const TEXTE_LONG = `Une requête HTTP conditionnelle envoie \`If-None-Match\` avec l'étiquette reçue à la
réponse précédente. Le serveur compare, et répond 304 sans corps quand la ressource n'a pas changé.
Le navigateur sert alors sa copie, ce qui économise la bande passante mais pas l'aller-retour. Un
\`Cache-Control: immutable\` supprime cet aller-retour, au prix d'une empreinte dans l'URL.`;

async function demandesPour(atomId: string): Promise<number> {
  return prisma.generationJob.count({ where: { kind: "VARIANTS", atomIds: { has: atomId } } });
}

/**
 * Vingt modifications du même concept, sans attendre. Les jobs mis en file
 * sont ensuite exécutés pour compter les appels qui seraient partis.
 */
export async function casModificationsEnBoucle(userId: string): Promise<void> {
  await viderLeCompte(userId);

  const concept = await fabriquerConcept(userId, {
    libelle: "Un concept qu'on corrige et recorrige",
  });

  for (let tour = 1; tour <= TENTATIVES; tour += 1) {
    await modifierConcept(
      concept.atomId,
      userId,
      `Reformulation numéro ${tour} du même concept, assez longue pour passer la borne.`,
    );
  }

  const demandes = await demandesPour(concept.atomId);

  const { appels, places } = await enModeCompteur(await plafondLarge(), async () => {
    const jobs = await prisma.generationJob.findMany({
      where: { kind: "VARIANTS", status: "QUEUED", atomIds: { has: concept.atomId } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    for (const job of jobs) await runJob(job.id);
  });

  record(
    `Régénération — ${TENTATIVES} modifications d'affilée ne demandent pas ${TENTATIVES} fois des questions`,
    demandes <= 1,
    `${demandes} demande(s) en file`,
  );

  record(
    `Régénération — le plafond hebdomadaire borne les appels partis, quel que soit le chemin`,
    appels <= 1,
    `${appels} appel(s) émis, ${places} place(s) prises au plafond global`,
  );
}

/**
 * Déposer, voir un concept mal découpé, le corriger dans la minute. La fenêtre
 * hebdomadaire ne compte que les réécritures : le premier jeu de questions n'en
 * est pas une, donc la première correction est servie tout de suite.
 */
export async function casCorrectionApresDepot(userId: string): Promise<void> {
  await viderLeCompte(userId);

  const depot = await deposer(
    userId,
    formulaire({ texte: TEXTE_LONG, cleEnvoi: "verif-correction-immediate" }),
  );

  if (!depot.ok) throw new Error(`Le dépôt a été refusé : ${depot.motif}`);

  await executerToutLePipeline(depot.inputId);

  const concept = await prisma.atom.findFirstOrThrow({
    where: { inputId: depot.inputId },
    select: { id: true },
  });
  const avant = await prisma.variant.count({ where: { atomId: concept.id, retiredAt: null } });

  const jobs = await modifierConcept(
    concept.id,
    userId,
    "Le concept, corrigé dans la minute qui suit son dépôt.",
  );

  record(
    "Correction — corriger juste après un dépôt n'attend pas la semaine",
    Array.isArray(jobs) && jobs.length === 1,
    jobs === null ? "concept introuvable" : `${jobs.length} job(s) à lancer tout de suite`,
  );

  // Le chemin réel de la Server Action : appel direct, comme pour un dépôt.
  for (const jobId of jobs ?? []) await runJob(jobId);

  const apres = await prisma.variant.count({ where: { atomId: concept.id, retiredAt: null } });

  record(
    "Correction — les questions neuves sont là, pas dans sept jours",
    apres > 0,
    `${avant} question(s) avant, ${apres} après la correction`,
  );

  // Et le plafond se referme derrière : la fenêtre part de cette réécriture-là.
  await prisma.generationJob.updateMany({
    where: { kind: "VARIANTS", atomIds: { has: concept.id }, status: "QUEUED" },
    data: { status: "DONE" },
  });

  const seconde = await modifierConcept(
    concept.id,
    userId,
    "Une seconde correction, dans la foulée de la première.",
  );
  const differees = await prisma.generationJob.count({
    where: { kind: "VARIANTS", atomIds: { has: concept.id }, notBefore: { not: null } },
  });

  record(
    "Correction — la seconde correction, elle, prend rendez-vous",
    Array.isArray(seconde) && seconde.length === 0 && differees === 1,
    `${seconde?.length ?? "aucun"} job immédiat, ${differees} demande(s) datée(s)`,
  );
}

/**
 * Une modification que le plafond refuse : le texte est accepté, les anciennes
 * questions (qui le contrediraient) sont retirées, et la demande attend sa
 * date. On vérifie qu'elle est écrite, qu'elle ne part pas avant, et que
 * l'écran le dit.
 */
export async function casModificationReportee(userId: string, maintenant: Date): Promise<void> {
  await viderLeCompte(userId);

  const concept = await fabriquerConcept(userId, { libelle: "Un concept corrigé deux fois" });

  await modifierConcept(
    concept.atomId,
    userId,
    "La première correction, celle qui part tout de suite.",
  );
  await prisma.generationJob.updateMany({
    where: { kind: "VARIANTS", atomIds: { has: concept.atomId } },
    data: { status: "DONE", finishedAt: maintenant },
  });

  await modifierConcept(concept.atomId, userId, "La seconde correction, dans la minute qui suit.");

  const jobs = await prisma.generationJob.findMany({
    where: { kind: "VARIANTS", atomIds: { has: concept.atomId } },
    orderBy: { createdAt: "asc" },
    select: { status: true, notBefore: true },
  });
  const differe = jobs.find((job) => job.notBefore !== null);
  const actives = await prisma.variant.count({
    where: { atomId: concept.atomId, retiredAt: null },
  });

  record(
    "Modification — la demande refusée n'est pas jetée, elle prend rendez-vous",
    differe !== undefined,
    differe
      ? `demande écrite pour le ${differe.notBefore?.toISOString().slice(0, 10)}`
      : `${jobs.length} demande(s), aucune datée`,
  );

  record(
    "Modification — les questions qui ne décrivent plus le concept ne sont plus servies",
    actives === 0,
    `${actives} question(s) encore servable(s)`,
  );

  // Le déclenchement direct est le chemin le plus court vers l'exécution : s'il
  // ignore la date, la garde ne vaut rien.
  const { appels } = await enModeCompteur(await plafondLarge(), async () => {
    const enAttente = await prisma.generationJob.findMany({
      where: { kind: "VARIANTS", status: "QUEUED", atomIds: { has: concept.atomId } },
      select: { id: true },
    });

    for (const job of enAttente) await runJob(job.id);
  });

  record(
    "Modification — une demande datée ne part pas avant sa date, même déclenchée à la main",
    appels === 0,
    `${appels} appel(s) émis`,
  );

  const depot = await lireDepotDetaille(concept.inputId, userId);
  const etat = depot
    ? etatDuDepot({
        status: depot.status,
        travaux: depot.travauxEnCours,
        concepts: depot.concepts.length,
      })
    : null;

  record(
    "Modification — l'écran dit que les questions attendent, pas qu'elles s'écrivent",
    etat === "questions-differees",
    etat ? etatDepot[etat] : "dépôt introuvable",
  );
}

/**
 * Une modification compte comme une réécriture (`derniereReecriture`) et gèle
 * donc le seuil d'usure pour la semaine.
 */
export async function casUsureApresModification(userId: string, maintenant: Date): Promise<void> {
  await viderLeCompte(userId);

  const concept = await fabriquerConcept(userId, { libelle: "Un concept modifié puis usé" });
  await modifierConcept(
    concept.atomId,
    userId,
    "Une reformulation qui remet les questions en file.",
  );

  const usees = FACETTES.map((facet, rang) => ({
    id: `variante-${rang}`,
    facet,
    sessionCount: 9,
    trainingCount: 9,
    lastSessionAt: maintenant,
  }));

  const avant = await demandesPour(concept.atomId);
  await regenererSiUsees({ id: concept.atomId, inputId: concept.inputId }, usees, maintenant);
  const apres = await demandesPour(concept.atomId);

  record(
    "Régénération — une modification gèle le seuil d'usure pour la semaine",
    apres === avant,
    apres === avant ? "aucune demande de plus" : `${apres - avant} demande(s) ajoutée(s)`,
  );
}

/**
 * Le redécoupage en rafale. Il n'écrit pas de dépôt mais passe par
 * `reserverDepot`, dont la fenêtre de débit doit l'arrêter comme un dépôt.
 */
export async function casRedecoupageEnRafale(userId: string): Promise<void> {
  await viderLeCompte(userId);

  const depot = await deposer(userId, formulaire({ texte: TEXTE_LONG, cleEnvoi: "verif-rafale" }));

  if (!depot.ok) throw new Error(`Le dépôt initial a été refusé : ${depot.motif}`);

  await executerToutLePipeline(depot.inputId);
  await prisma.atom.deleteMany({ where: { inputId: depot.inputId } });

  const debut = Date.now();
  let acceptes = 0;
  let arret = "aucun refus";
  let debitAtteint = false;

  for (let tour = 0; tour < TENTATIVES; tour += 1) {
    const relance = await redecouper(userId, depot.inputId);

    if (!relance.ok) {
      debitAtteint = relance.quota === false;
      arret = relance.motif;
      break;
    }

    acceptes += 1;
    await executerToutLePipeline(depot.inputId);
    await prisma.atom.deleteMany({ where: { inputId: depot.inputId } });
  }

  const secondes = Math.round((Date.now() - debut) / 1000);

  record(
    "Redécoupage — la limite de débit borne aussi les relances rapprochées",
    debitAtteint,
    `${acceptes} extraction(s) achetées en ${secondes} s, sans un seul refus de débit — arrêté par « ${arret} »`,
  );
}
