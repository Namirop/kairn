import { prisma } from "@/lib/db/client";
import type { AtomState, GenerationKind, InputStatus } from "@/lib/db/types";

/**
 * Un dépôt et ce qu'il a donné, tel que son écran le lit.
 *
 * Séparé des gestes qui corrigent un concept : lire un dépôt et le réécrire
 * n'ont ni les mêmes appelants ni les mêmes raisons de changer. La propriété se
 * vérifie ici comme ailleurs — un dépôt qui n'est pas à l'utilisateur n'est pas
 * trouvé, donc pas lu.
 */

export type ConceptLu = {
  id: string;
  concept: string;
  tags: string[];
  uncertain: boolean;
  state: AtomState;
  /** Sorti du cycle par l'utilisateur — et donc remettable par lui. */
  archivedByUser: boolean;
  /**
   * Combien de questions portent ce concept, sans leur texte.
   *
   * Les lire hors session reviendrait à se gâcher la surprise : on retient une
   * formulation qu'on n'a pas eu à retrouver, et la question suivante ne mesure
   * plus rien. Le nombre suffit à dire que le travail est fait.
   */
  questions: number;
};

export type DepotDetaille = {
  id: string;
  rawContent: string;
  extractedText: string | null;
  status: InputStatus;
  failureReason: string | null;
  /** Le dépôt portait plus de concepts que le plafond ; on a gardé la tête. */
  conceptsTronques: boolean;
  /** La capture portait plus de texte qu'un dépôt n'en accepte. */
  texteTronque: boolean;
  createdAt: Date;
  concepts: ConceptLu[];
  /** Travaux encore en cours ou en attente, avec leur nature : c'est elle qui
   * dit à l'utilisateur ce qu'il attend. `differe` distingue ce qui s'écrit
   * maintenant de ce qui a rendez-vous. */
  travauxEnCours: { kind: GenerationKind; differe: boolean }[];
};

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
  const maintenant = new Date();

  return {
    ...reste,
    concepts: atoms.map(({ _count, ...atome }) => ({ ...atome, questions: _count.variants })),
    travauxEnCours: jobs.map(({ kind, notBefore }) => ({
      kind,
      differe: notBefore !== null && notBefore > maintenant,
    })),
  };
}
