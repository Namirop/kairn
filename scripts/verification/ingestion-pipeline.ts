import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { confirmerConcept, modifierConcept } from "@/lib/db/concepts";
import { deposer } from "@/lib/depots/deposer";
import { TROU } from "@/lib/domain/reponse-cloze";
import {
  compterQuestions,
  executerToutLePipeline,
  formulaire,
  libererLaJournee,
} from "./depot-simule";
import { record } from "./journal";

/**
 * Le pipeline, du geste jusqu'aux questions écrites, en mode mock.
 *
 * Chaque cas part d'un dépôt et va jusqu'au bout : c'est le seul niveau où l'on
 * voit si les étapes se passent vraiment le relais.
 */

const TECHNIQUE = `Le tableau des méthodes de \`Array\` s'est enrichi avec \`at()\`, qui accepte un index
négatif et va chercher depuis la fin. \`useMemo\` ne garantit rien : React se réserve le droit de
jeter le cache d'un rendu à l'autre, ce n'est pas une promesse de mémoïsation mais une indication.
Enfin, une transaction Postgres en \`READ COMMITTED\` voit les écritures validées par les autres
sessions entre deux instructions, ce qui suffit à casser un compteur lu puis écrit.`;

/** Ce qu'un texte à trou dépose dans `payload`, tel que la révision le relira. */
const PAYLOAD_CLOZE = z.object({
  sentence: z.string().min(1),
  accepted: z.array(z.string().min(1)).min(1),
});

const FICTION = `Le dragon des cendres ne crache pas de flamme mais une poussière brûlante, qui
s'enflamme au contact de l'air humide. On ne l'approche donc jamais par temps de pluie, sous peine
de déclencher la charge avant qu'il ne la libère lui-même.`;

const DOUTEUX = `En JavaScript, les promesses lancées concurrently s'exécutent sur plusieurs cœurs,
ce qui rend Promise.all réellement parallèle. Un tableau de promesses passé à Promise.all se règle
quand la dernière se règle.`;

async function fixerFacture(inputId: string): Promise<void> {
  // Hors requête HTTP, `after()` ne part pas : on déroule ce qui serait parti.
  await executerToutLePipeline(inputId);
}

async function deposerEtDerouler(
  userId: string,
  champs: Record<string, string>,
  image?: File,
): Promise<string> {
  await libererLaJournee(userId);
  const resultat = await deposer(userId, formulaire(champs, image));

  if (!resultat.ok) throw new Error(`Dépôt refusé : ${resultat.motif}`);

  await fixerFacture(resultat.inputId);

  return resultat.inputId;
}

export async function casDepotTexte(userId: string): Promise<void> {
  const inputId = await deposerEtDerouler(userId, { texte: TECHNIQUE, cleEnvoi: "verif-texte-01" });
  const depot = await prisma.input.findUniqueOrThrow({
    where: { id: inputId },
    include: { atoms: true },
  });
  const questions = await compterQuestions(inputId);

  record(
    "Texte — le dépôt produit ses concepts puis ses questions",
    depot.status === "READY" && depot.atoms.length === 3 && questions === 12,
    `${depot.status}, ${depot.atoms.length} concepts, ${questions} questions`,
  );

  // Le cœur du §7 : les questions sont là sans qu'aucun lot soit parti. C'est
  // la seule assertion qui distingue l'appel direct de l'envoi groupé, les deux
  // écrivant les mêmes questions au bout du compte.
  const lots = await prisma.aiBatch.count({ where: { jobs: { some: { inputId } } } });
  const enAttente = await prisma.generationJob.count({
    where: { inputId, kind: "VARIANTS", status: { in: ["QUEUED", "RUNNING"] } },
  });

  record(
    "Texte — les questions arrivent en appel direct, sans passer par un lot",
    questions === 12 && lots === 0 && enAttente === 0,
    `${lots} lot(s) soumis, ${enAttente} job(s) de questions encore en file`,
  );

  const planifie = await prisma.variant.count({ where: { atom: { inputId }, retiredAt: null } });
  record(
    "Texte — les questions sont réparties sur les trois concepts",
    new Set(depot.atoms.map((atome) => atome.id)).size === 3 && planifie === 12,
    `${planifie} questions actives`,
  );

  // Ce que le format ajoute doit traverser le pipeline entier. Un texte à trou
  // dont les formes acceptées se perdent en route ne se vérifie plus : il
  // redevient une question à s'auto-noter, exactement ce qu'on cherche à éviter.
  const trous = await prisma.variant.findMany({
    where: { atom: { inputId }, format: "CLOZE" },
    select: { payload: true },
  });
  const complets = trous.filter((trou) => {
    const lu = PAYLOAD_CLOZE.safeParse(trou.payload);

    return lu.success && lu.data.sentence.includes(TROU);
  });

  record(
    "Texte — un texte à trou garde sa phrase trouée et ses formes acceptées",
    trous.length > 0 && complets.length === trous.length,
    `${complets.length} sur ${trous.length} texte(s) à trou`,
  );
}

export async function casDepotImage(userId: string, image: File): Promise<void> {
  const inputId = await deposerEtDerouler(userId, { texte: "", cleEnvoi: "verif-image-01" }, image);
  const depot = await prisma.input.findUniqueOrThrow({
    where: { id: inputId },
    include: { atoms: true },
  });

  record(
    "Capture — la lecture alimente le découpage",
    depot.sourceType === "IMAGE" &&
      (depot.extractedText ?? "").length > 0 &&
      depot.atoms.length === 3,
    `${depot.status}, ${depot.atoms.length} concepts`,
  );

  record(
    "Capture — les octets de l'image ne survivent pas à sa lecture",
    depot.imageData === null && depot.imageMediaType === null,
    depot.imageData === null ? "effacés" : `${depot.imageData.length} octets restants`,
  );
}

export async function casCaptureIllisible(userId: string, image: File): Promise<void> {
  const inputId = await deposerEtDerouler(
    userId,
    { texte: "capture floue prise de loin", cleEnvoi: "verif-image-02" },
    image,
  );
  const depot = await prisma.input.findUniqueOrThrow({ where: { id: inputId } });

  record(
    "Capture illisible — le dépôt est rejeté avec un motif, sans garder l'image",
    depot.status === "REJECTED" && (depot.failureReason ?? "").length > 0 && !depot.imageData,
    depot.failureReason ?? "aucun motif",
  );
}

export async function casRejet(userId: string): Promise<void> {
  const inputId = await deposerEtDerouler(userId, {
    texte: "Ma liste de courses : lentilles corail, pain, café, dentifrice.",
    cleEnvoi: "verif-rejet-01",
  });
  const depot = await prisma.input.findUniqueOrThrow({ where: { id: inputId } });

  record(
    "Rien à retenir — le dépôt porte le motif du refus",
    depot.status === "REJECTED" && (depot.failureReason ?? "").length > 0,
    depot.failureReason ?? "aucun motif",
  );
}

export async function casConceptDouteux(userId: string): Promise<void> {
  const inputId = await deposerEtDerouler(userId, { texte: DOUTEUX, cleEnvoi: "verif-doute-01" });
  const douteux = await prisma.atom.findFirstOrThrow({ where: { inputId, uncertain: true } });
  const questionsDouteuses = await prisma.variant.count({ where: { atomId: douteux.id } });
  const total = await compterQuestions(inputId);

  record(
    "Concept douteux — aucune question n'est écrite dessus",
    questionsDouteuses === 0 && total === 4,
    `${questionsDouteuses} sur le douteux, ${total} en tout`,
  );

  await confirmerConcept(douteux.id, userId);
  await fixerFacture(inputId);

  const apresConfirmation = await prisma.variant.count({ where: { atomId: douteux.id } });
  record(
    "Concept douteux — le confirmer lui écrit ses questions",
    apresConfirmation === 4,
    `${apresConfirmation} questions`,
  );
}

/**
 * Un dépôt dont les énoncés n'ont pas à être vrais du monde.
 *
 * C'était le chemin mort du produit : les règles d'un jeu, la chronologie d'un
 * univers de fiction ou une procédure interne ressortaient toutes marquées
 * douteuses, donc sans une seule question. Le dépôt était accepté, il comptait
 * au quota, et il ne produisait rien.
 *
 * Les deux concepts de la fixture sont douteux, et c'est le point : ce cas
 * échoue si le doute reprend la main sur autre chose que du factuel.
 */
export async function casDepotDeFiction(userId: string): Promise<void> {
  const inputId = await deposerEtDerouler(userId, { texte: FICTION, cleEnvoi: "verif-fiction-01" });
  const depot = await prisma.input.findUniqueOrThrow({
    where: { id: inputId },
    include: { atoms: true },
  });
  const douteux = depot.atoms.filter((atome) => atome.uncertain).length;
  const questions = await compterQuestions(inputId);

  record(
    "Fiction — un dépôt qui n'a pas à être vrai obtient quand même ses questions",
    depot.nature === "FICTION" && douteux === 2 && questions === 8,
    `nature ${depot.nature ?? "absente"}, ${douteux} douteux, ${questions} questions`,
  );
}

export async function casCorrectionDeConcept(userId: string): Promise<void> {
  const atome = await prisma.atom.findFirstOrThrow({
    where: { userId, uncertain: false, variants: { some: {} } },
    include: { variants: true },
  });
  const avant = atome.variants.map((variant) => variant.id);

  await prisma.atom.update({
    where: { id: atome.id },
    data: { state: "REVIEWING", reps: 4, lapses: 1, stability: 12 },
  });

  // Ce concept vient d'être découpé, donc ses questions viennent d'être
  // demandées : une correction dans la foulée tomberait sous le plafond
  // hebdomadaire et partirait en demande différée. On vieillit la demande
  // précédente pour éprouver ici ce que ce cas éprouve — la réécriture — et non
  // le plafond, qui a ses propres lignes dans `verify:abus`.
  await prisma.generationJob.updateMany({
    where: { kind: "VARIANTS", atomIds: { has: atome.id } },
    data: { createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  });

  await modifierConcept(
    atome.id,
    userId,
    "Une reformulation écrite à la main, assez longue pour passer.",
  );

  // Retirées, pas supprimées : `Review.variantId` est en cascade, et les
  // effacer emporterait tous les passages donnés sur ce concept. Ce qui doit
  // disparaître, c'est leur présence dans le tirage, pas leur existence.
  const servables = await prisma.variant.count({
    where: { id: { in: avant }, retiredAt: null },
  });
  const gardees = await prisma.variant.count({ where: { id: { in: avant } } });
  record(
    "Correction — les anciennes questions sortent du tirage sans sortir de la base",
    servables === 0 && gardees === avant.length,
    `${servables} servable(s), ${gardees} conservée(s) sur ${avant.length}`,
  );

  await fixerFacture(atome.inputId);

  const apres = await prisma.atom.findUniqueOrThrow({
    where: { id: atome.id },
    include: { variants: { where: { retiredAt: null } } },
  });
  record(
    "Correction — la planification repart de zéro et les questions sont réécrites",
    apres.state === "LEARNING" && apres.reps === 0 && apres.variants.length === 4,
    `${apres.state}, ${apres.reps} passage(s), ${apres.variants.length} questions`,
  );
}
