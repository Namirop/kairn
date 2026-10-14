import { prisma } from "@/lib/db/client";
import type { AtomState, GenerationKind, InputStatus } from "@/lib/db/types";
import type { AvancementDepot } from "@/lib/domain/etat-depot";

/**
 * Un dépôt et ce qu'il a donné, tel que son écran le lit. La propriété se
 * vérifie dans la requête : un dépôt qui n'est pas à l'utilisateur n'est pas
 * trouvé.
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
   * Combien de questions portent ce concept, sans leur texte : les lire hors
   * session ferait retenir une formulation, et la question ne mesurerait plus
   * rien.
   */
  questions: number;
};

export type DepotDetaille = {
  id: string;
  rawContent: string;
  extractedText: string | null;
  /** La consigne jointe au dépôt, ou rien. Relue pour être montrée, pas pour agir. */
  instruction: string | null;
  /**
   * Ce que la consigne a laissé du dépôt, vérifié fidèle et jamais réécrit
   * (`lib/domain/texte-retenu.ts`). Nul quand la consigne n'a rien retranché.
   */
  texteRetenu: string | null;
  status: InputStatus;
  failureReason: string | null;
  /** Le dépôt portait plus de concepts que le plafond ; on a gardé la tête. */
  conceptsTronques: boolean;
  /** La capture portait plus de texte qu'un dépôt n'en accepte. */
  texteTronque: boolean;
  createdAt: Date;
  concepts: ConceptLu[];
  /** Travaux en cours ou en attente. `differe` : ceux dont le `notBefore` n'est
   * pas encore échu. */
  travauxEnCours: { kind: GenerationKind; differe: boolean }[];
};

/** Chaque travail, marqué `differe` tant que son `notBefore` n'est pas échu. */
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
 * Juste de quoi savoir si l'écran a changé : l'écran de détail l'interroge en
 * boucle tant qu'un travail tourne, et ne recharge le reste (`router.refresh()`)
 * que quand l'état, les travaux ou le nombre de concepts bougent.
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
