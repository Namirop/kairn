import { prisma } from "@/lib/db/client";
import { lireReservationsDuJour } from "@/lib/db/ai-quota";
import { modifierConcept } from "@/lib/db/concepts";
import { lireDepotDetaille } from "@/lib/db/depot-detaille";
import { regenererSiUsees } from "@/lib/db/regeneration";
import { etatDuDepot, libelleEtat } from "@/lib/domain/etat-depot";
import { deposer } from "@/lib/depots/deposer";
import { redecouper } from "@/lib/depots/redecouper";
import { runJob } from "@/lib/jobs/runner";
import { FACETTES, enModeCompteur, fabriquerConcept, viderLeCompte } from "./abus-fabrique";
import { executerToutLePipeline, formulaire } from "./depot-simule";
import { record } from "./journal";

/**
 * Les vecteurs de régénération, comptés en appels.
 *
 * Chaque écriture de questions est un appel payant. Le plafond d'une
 * régénération par concept et par semaine n'existe que si **tous** les chemins
 * le traversent — un seul qui l'évite, et la boucle est ouverte.
 *
 * Les appels ne sont pas devinés : ils sont comptés au registre, en mode
 * compteur, sans qu'aucune requête ne sorte. Voir `enModeCompteur`.
 */

const TENTATIVES = 20;

/**
 * Assez de places pour que le plafond global n'intervienne pas — posées
 * au-dessus de ce que la journée a déjà pris. Le banc d'évaluation dépense
 * réellement sur la même journée UTC, et un plafond posé en absolu rétrécissait
 * donc à mesure qu'on s'en servait.
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
 * Vingt modifications du même concept, en boucle, sans attendre.
 *
 * C'est le geste le plus banal du produit — corriger un concept mal découpé —
 * et rien ne le borne aujourd'hui. Les jobs mis en file sont ensuite exécutés
 * pour la seule chose qui compte : combien d'appels seraient partis.
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
 * Le geste le plus normal du produit : déposer, voir un concept mal découpé, le
 * corriger dans la minute.
 *
 * Il tombait sous le plafond hebdomadaire, parce que la fenêtre partait de
 * n'importe quelle demande de questions — y compris celle du dépôt lui-même. La
 * correction retirait les questions et la réécriture attendait sept jours. La
 * fenêtre ne compte plus que les réécritures : le premier jeu de questions d'un
 * concept n'en est pas une, et la première correction est toujours servie.
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
 * Ce qu'on fait d'une modification que le plafond refuse.
 *
 * Trois issues étaient possibles et une seule est honnête. Garder les anciennes
 * questions servirait des questions qui contredisent le texte. Refuser la
 * modification retiendrait une correction que la personne a demandée. Reste :
 * on accepte le texte, on retire les questions, et la demande attend sa date au
 * lieu d'être jetée — ce qui suppose qu'elle soit vraiment écrite, qu'elle ne
 * parte vraiment pas avant, et que l'écran le dise.
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
    etat ? libelleEtat(etat) : "dépôt introuvable",
  );
}

/**
 * Le plafond hebdomadaire lui-même, sur le chemin qu'il couvre.
 *
 * `derniereDemande` lit n'importe quel job de questions, d'où qu'il vienne :
 * une modification compte donc comme une demande et gèle le seuil d'usure pour
 * la semaine. C'est le sens qu'on veut — reste à vérifier qu'il tient.
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
 * Le redécoupage en rafale.
 *
 * La limite de débit se lit sur les dépôts écrits dans la dernière minute. Un
 * redécoupage n'écrit pas de dépôt : il prend une place du jour, mais il ne se
 * voit pas dans la fenêtre courte. Reste à savoir combien d'extractions ça
 * permet d'acheter d'affilée, sans attendre une seconde.
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
