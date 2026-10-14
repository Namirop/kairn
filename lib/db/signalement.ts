import { prisma } from "@/lib/db/client";
import type { MotifDeSignalement, VariantFacet, VariantFormat } from "@/lib/db/types";

/**
 * Ce que quelqu'un dit d'une question qui ne va pas : le seul signal sur une
 * mauvaise question, qui se subit en silence.
 *
 * Rien n'est régénéré automatiquement : la question sort du tirage, c'est
 * tout. Réécrire coûterait un appel sur la foi d'un clic et effacerait la
 * trace qu'on veut garder.
 */

export type SignalementAEcrire = {
  userId: string;
  variantId: string;
  motif: MotifDeSignalement;
  commentaire: string | null;
};

/**
 * Écrit le signalement et retire la question du tirage.
 *
 * Le client n'envoie que des identifiants et un motif : le contexte (question,
 * réponse, concept, modèle, version du prompt) est lu en base, donc ne peut
 * pas être arrangé. Les textes sont recopiés, pour rester lisibles après la
 * suppression du concept, geste naturel après un signalement.
 *
 * Rend `false` si la question n'appartient pas à cette personne.
 */
export async function signalerUneQuestion(
  signalement: SignalementAEcrire,
  maintenant: Date = new Date(),
): Promise<boolean> {
  const variante = await prisma.variant.findFirst({
    where: { id: signalement.variantId, atom: { userId: signalement.userId } },
    select: {
      id: true,
      question: true,
      answerKey: true,
      format: true,
      facet: true,
      model: true,
      promptVersion: true,
      atom: { select: { id: true, concept: true, inputId: true } },
    },
  });

  if (!variante) return false;

  await prisma.$transaction([
    prisma.signalement.create({
      data: {
        userId: signalement.userId,
        variantId: variante.id,
        atomId: variante.atom.id,
        inputId: variante.atom.inputId,
        motif: signalement.motif,
        commentaire: signalement.commentaire,
        question: variante.question,
        reponse: variante.answerKey,
        concept: variante.atom.concept,
        format: variante.format,
        facet: variante.facet,
        model: variante.model ?? "inconnu",
        promptVersion: variante.promptVersion,
      },
    }),
    // Déjà retirée (deux onglets) : le premier signalement garde sa date.
    prisma.variant.updateMany({
      where: { id: variante.id, retiredAt: null },
      data: { retiredAt: maintenant },
    }),
  ]);

  return true;
}

export type SignalementLu = {
  id: string;
  motif: MotifDeSignalement;
  commentaire: string | null;
  concept: string;
  question: string;
  reponse: string;
  format: VariantFormat;
  facet: VariantFacet;
  model: string;
  promptVersion: string | null;
  atomId: string | null;
  inputId: string | null;
  /** Nul quand le concept a été supprimé depuis : le signalement, lui, reste. */
  conceptExisteEncore: boolean;
  createdAt: Date;
};

export type PageDeSignalements = {
  lignes: SignalementLu[];
  /** Le total de la table, pas celui de la page : c'est lui qui pagine. */
  total: number;
  page: number;
  pages: number;
};

/**
 * Une page de signalements, la plus récente d'abord. Le rang vient de l'URL :
 * il est ramené dans les bornes plutôt que refusé, la dernière page étant
 * manifestement ce qu'on voulait.
 */
export async function listerLesSignalementsPagines(
  rang: number,
  parPage: number,
): Promise<PageDeSignalements> {
  const total = await prisma.signalement.count();
  const pages = Math.max(1, Math.ceil(total / parPage));
  const page = Math.min(Math.max(1, Math.trunc(rang) || 1), pages);

  const lignes = await prisma.signalement.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * parPage,
    take: parPage,
  });

  return { lignes: await enrichir(lignes), total, page, pages };
}

/** Les signalements, les plus récents d'abord. Lecture d'administration. */
export async function listerLesSignalements(limite = 100): Promise<SignalementLu[]> {
  return enrichir(
    await prisma.signalement.findMany({ orderBy: { createdAt: "desc" }, take: limite }),
  );
}

/**
 * Dit, pour chaque ligne, si le concept d'origine existe encore, en une requête
 * pour toute la page. La copie du concept ne prouve pas qu'il n'a pas été
 * supprimé depuis.
 */
async function enrichir(
  lignes: Awaited<ReturnType<typeof prisma.signalement.findMany>>,
): Promise<SignalementLu[]> {
  const atomIds = lignes.flatMap((ligne) => (ligne.atomId ? [ligne.atomId] : []));
  const vivants = new Set(
    (await prisma.atom.findMany({ where: { id: { in: atomIds } }, select: { id: true } })).map(
      (atome) => atome.id,
    ),
  );

  return lignes.map((ligne) => ({
    id: ligne.id,
    motif: ligne.motif,
    commentaire: ligne.commentaire,
    concept: ligne.concept,
    question: ligne.question,
    reponse: ligne.reponse,
    format: ligne.format,
    facet: ligne.facet,
    model: ligne.model,
    promptVersion: ligne.promptVersion,
    atomId: ligne.atomId,
    inputId: ligne.inputId,
    conceptExisteEncore: ligne.atomId !== null && vivants.has(ligne.atomId),
    createdAt: ligne.createdAt,
  }));
}
