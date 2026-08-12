import { prisma } from "@/lib/db/client";
import type { MotifDeSignalement, VariantFacet, VariantFormat } from "@/lib/db/types";

/**
 * Ce que quelqu'un dit d'une question qui ne va pas.
 *
 * C'est la seule instrumentation du produit. Les prompts ont été réglés sur onze
 * dépôts d'exemple, et rien d'autre ne dira quand une question part en vrille
 * chez quelqu'un d'autre — un mauvais découpage se voit, une mauvaise question
 * se subit en silence.
 *
 * **Rien n'est régénéré automatiquement.** La question signalée sort du tirage,
 * on remercie, on passe. Réécrire dans la foulée coûterait un appel sur la foi
 * d'un clic, et surtout effacerait la trace qu'on cherchait justement à garder.
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
 * Le contexte n'est pas demandé à l'appelant : il est lu en base au moment du
 * geste. Ce qu'un client envoie, ce sont deux identifiants et un motif ; tout le
 * reste — la question, sa réponse, le concept, le format, la facette, le modèle
 * et l'empreinte du prompt — vient de la ligne elle-même, et ne peut donc pas
 * être arrangé.
 *
 * Les textes sont **recopiés** dans le signalement. Signaler une question fausse
 * puis supprimer le concept est le geste naturel, et c'est précisément ce
 * signalement-là qu'on veut pouvoir lire un mois plus tard.
 *
 * Rend `false` quand la question n'est pas celle de cette personne : l'identifiant
 * vient du client, il n'est jamais cru sur parole.
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
    // Déjà retirée : on ne repousse pas sa date. Deux signalements sur la même
    // question sont possibles depuis deux onglets, et le premier fait foi.
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

/** Les signalements, les plus récents d'abord. Lecture d'administration. */
export async function listerLesSignalements(limite = 100): Promise<SignalementLu[]> {
  const lignes = await prisma.signalement.findMany({
    orderBy: { createdAt: "desc" },
    take: limite,
  });

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
