import { prisma } from "@/lib/db/client";
import type { AtomState, GenerationKind, InputStatus } from "@/lib/db/types";
import type { AvancementDepot } from "@/lib/domain/etat-depot";

/** Propriété vérifiée dans la requête : le dépôt d'un autre n'est pas trouvé. */

export type ConceptLu = {
  id: string;
  concept: string;
  tags: string[];
  uncertain: boolean;
  state: AtomState;
  /** Sorti du cycle par l'utilisateur, donc remettable par lui. */
  archivedByUser: boolean;
  /** Le nombre seul : lues hors session, on retiendrait une formulation. */
  questions: number;
};

export type DepotDetaille = {
  id: string;
  rawContent: string;
  extractedText: string | null;
  /** Relue pour être montrée, pas pour agir. */
  instruction: string | null;
  /** Ce que la consigne a laissé, vérifié fidèle ; nul si rien n'a été retranché. */
  texteRetenu: string | null;
  status: InputStatus;
  failureReason: string | null;
  /** Plus de concepts que le plafond : la tête est gardée. */
  conceptsTronques: boolean;
  /** La capture portait plus de texte qu'un dépôt n'en accepte. */
  texteTronque: boolean;
  createdAt: Date;
  concepts: ConceptLu[];
  travauxEnCours: { kind: GenerationKind; differe: boolean }[];
};

/** `differe` tant que `notBefore` n'est pas échu. */
function travauxDifferes(
  jobs: { kind: GenerationKind; notBefore: Date | null }[],
  maintenant: Date,
): { kind: GenerationKind; differe: boolean }[] {
  return jobs.map(({ kind, notBefore }) => ({
    kind,
    differe: notBefore !== null && notBefore > maintenant,
  }));
}

export async function lireDepotDetaille(
  inputId: string,
  userId: string,
): Promise<DepotDetaille | null> {
  const depot = await prisma.input.findFirst({
    where: { id: inputId, userId },
    select: {
      id: true,
      rawContent: true,
      extractedText: true,
      instruction: true,
      texteRetenu: true,
      status: true,
      failureReason: true,
      conceptsTronques: true,
      texteTronque: true,
      createdAt: true,
      atoms: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          concept: true,
          tags: true,
          uncertain: true,
          state: true,
          archivedByUser: true,
          _count: { select: { variants: { where: { retiredAt: null } } } },
        },
      },
      jobs: {
        where: { status: { in: ["QUEUED", "RUNNING"] } },
        select: { kind: true, notBefore: true },
      },
    },
  });

  if (!depot) return null;

  const { atoms, jobs, ...reste } = depot;

  return {
    ...reste,
    concepts: atoms.map(({ _count, ...atome }) => ({ ...atome, questions: _count.variants })),
    travauxEnCours: travauxDifferes(jobs, new Date()),
  };
}

/**
 * Interrogé en boucle tant qu'un travail tourne : l'écran ne recharge le reste
 * que si l'état, les travaux ou le nombre de concepts bougent.
 */
export async function lireAvancementDuDepot(
  inputId: string,
  userId: string,
): Promise<AvancementDepot | null> {
  const depot = await prisma.input.findFirst({
    where: { id: inputId, userId },
    select: {
      status: true,
      _count: { select: { atoms: true } },
      jobs: {
        where: { status: { in: ["QUEUED", "RUNNING"] } },
        select: { kind: true, notBefore: true },
      },
    },
  });

  if (!depot) return null;

  return {
    status: depot.status,
    concepts: depot._count.atoms,
    travaux: travauxDifferes(depot.jobs, new Date()),
  };
}
