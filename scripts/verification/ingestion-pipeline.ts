import { prisma } from "@/lib/db/client";
import { confirmerConcept, modifierConcept } from "@/lib/db/concepts";
import { deposer } from "@/lib/depots/deposer";
import { releverLots, soumettreLotsEnAttente } from "@/lib/jobs/questions";
import {
  compterQuestions,
  executerJobsEnAttente,
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

const DOUTEUX = `En JavaScript, les promesses lancées concurrently s'exécutent sur plusieurs cœurs,
ce qui rend Promise.all réellement parallèle. Un tableau de promesses passé à Promise.all se règle
quand la dernière se règle.`;

async function fixerFacture(inputId: string): Promise<void> {
  // Hors requête HTTP, `after()` ne part pas : on déroule ce qui serait parti.
  for (let passage = 0; passage < 3; passage += 1) {
    if ((await executerJobsEnAttente(inputId)) === 0) break;
  }

  await soumettreLotsEnAttente();
  await releverLots();
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

  const planifie = await prisma.variant.count({ where: { atom: { inputId }, retiredAt: null } });
  record(
    "Texte — les questions sont réparties sur les trois concepts",
    new Set(depot.atoms.map((atome) => atome.id)).size === 3 && planifie === 12,
    `${planifie} questions actives`,
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
    "Capture illisible — le dépôt échoue avec un motif, sans garder l'image",
    depot.status === "FAILED" && (depot.failureReason ?? "").length > 0 && !depot.imageData,
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
    depot.status === "FAILED" && (depot.failureReason ?? "").length > 0,
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

  await modifierConcept(
    atome.id,
    userId,
    "Une reformulation écrite à la main, assez longue pour passer.",
  );

  const survivantes = await prisma.variant.count({ where: { id: { in: avant } } });
  record(
    "Correction — les anciennes questions disparaissent",
    survivantes === 0,
    `${survivantes} question(s) survivante(s) sur ${avant.length}`,
  );

  await fixerFacture(atome.inputId);

  const apres = await prisma.atom.findUniqueOrThrow({
    where: { id: atome.id },
    include: { variants: true },
  });
  record(
    "Correction — la planification repart de zéro et les questions sont réécrites",
    apres.state === "LEARNING" && apres.reps === 0 && apres.variants.length === 4,
    `${apres.state}, ${apres.reps} passage(s), ${apres.variants.length} questions`,
  );
}
