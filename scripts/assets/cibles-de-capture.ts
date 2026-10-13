import { prisma } from "@/lib/db/client";
import type { Langue } from "@/lib/db/types";
import { optionsDUnQCM, texteATrouServi } from "@/lib/db/question-servie";
import { SEED_USER_ID } from "@/prisma/seed/account";
import { lireFigeDAssets } from "@/scripts/assets/fige";

/**
 * Ce que les captures visent en base : les dépôts du compte de démo rattachés à
 * leur sujet, et une bonne question par format pour la vitrine.
 *
 * « Bonne » au sens de la consigne : on choisit, parmi les vraies questions
 * générées, celle qui illustre le mieux le format — jamais on n'en invente une.
 */

export type DepotDeDemo = {
  id: string;
  cle: string;
  titre: string;
  estImage: boolean;
  langue: Langue;
};

/** Les dépôts seedés, appariés aux sujets du figé par leur texte. */
export async function depotsDeDemo(): Promise<DepotDeDemo[]> {
  const fige = lireFigeDAssets();
  const inputs = await prisma.input.findMany({
    where: { userId: SEED_USER_ID, status: "READY" },
    select: { id: true, rawContent: true, extractedText: true, langue: true },
    orderBy: { createdAt: "asc" },
  });

  const cibles: DepotDeDemo[] = [];

  for (const depot of fige) {
    const input = inputs.find(
      (entree) => entree.rawContent === depot.texte || entree.extractedText === depot.texte,
    );

    if (input) {
      cibles.push({
        id: input.id,
        cle: depot.cle,
        titre: depot.titre,
        estImage: depot.estImage,
        langue: input.langue,
      });
    }
  }

  return cibles;
}

export type CibleDeFormat = { format: string; variantId: string };

/** Peut-on servir ce format proprement, avec la charge qu'on a en base ? */
function servable(format: string, payload: unknown, answerKey: string): boolean {
  if (answerKey.trim().length === 0) return false;
  if (format === "MCQ") return optionsDUnQCM("MCQ", payload) !== null;
  if (format === "CLOZE") return texteATrouServi("CLOZE", payload) !== null;

  return true;
}

/**
 * Une question par format, celle dont la longueur d'énoncé approche le mieux une
 * cible lisible — assez pour être claire, pas au point d'être tronquée à l'écran.
 * Seulement parmi les dépôts de la langue capturée : une question anglaise n'a
 * rien à faire dans l'interface française.
 */
export async function variantesParFormat(langue: Langue): Promise<CibleDeFormat[]> {
  const LONGUEUR_CIBLE = 90;
  const variants = await prisma.variant.findMany({
    where: { atom: { userId: SEED_USER_ID, input: { langue } }, retiredAt: null },
    select: { id: true, format: true, question: true, answerKey: true, payload: true },
  });

  const meilleur = new Map<string, { id: string; ecart: number }>();

  for (const v of variants) {
    if (!servable(v.format, v.payload, v.answerKey)) continue;

    const ecart = Math.abs(v.question.length - LONGUEUR_CIBLE);
    const actuel = meilleur.get(v.format);

    if (!actuel || ecart < actuel.ecart) meilleur.set(v.format, { id: v.id, ecart });
  }

  return [...meilleur.entries()].map(([format, { id }]) => ({ format, variantId: id }));
}
