import { prisma } from "@/lib/db/client";
import { creerJobsDeQuestions } from "@/lib/db/lots";
import { assezEspacee, JOURS_ENTRE_REGENERATIONS } from "@/lib/domain/rotation-variantes";

/**
 * Seul point d'où l'on redemande des questions (usure, modification,
 * confirmation), sous le plafond hebdomadaire : sinon vingt clics sur
 * « modifier » achèteraient vingt appels. Un premier découpage n'a rien à
 * plafonner.
 */

/** Les retirées comptent : `relancerLesQuestions` les retire juste avant. */
async function aDejaEuDesQuestions(atomId: string): Promise<boolean> {
  return (await prisma.variant.count({ where: { atomId } })) > 0;
}

/**
 * Les jobs, pas les questions : on plafonne la dépense, et un échec a coûté un
 * appel. Le premier jeu ne compte pas, sinon il bloquerait la correction qui
 * suit un dépôt. `notBefore` prime : un report ne dépense qu'au jour où il part.
 */
async function derniereReecriture(atomId: string): Promise<Date | null> {
  const jobs = await prisma.generationJob.findMany({
    where: { kind: "VARIANTS", regeneration: true, atomIds: { has: atomId } },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { createdAt: true, notBefore: true },
  });
  const dernier = jobs[0];

  return dernier ? (dernier.notBefore ?? dernier.createdAt) : null;
}

async function dejaEnFile(atomId: string): Promise<boolean> {
  const enFile = await prisma.generationJob.count({
    where: { kind: "VARIANTS", status: { in: ["QUEUED", "RUNNING"] }, atomIds: { has: atomId } },
  });

  return enFile > 0;
}

const SEMAINE_MS = JOURS_ENTRE_REGENERATIONS * 24 * 60 * 60 * 1000;

export type DemandeDeQuestions =
  /** À l'appelant de le déclencher s'il est pressé. */
  | { etat: "partie"; jobs: string[] }
  | { etat: "reportee"; partiraLe: Date }
  | { etat: "deja-en-file" }
  /** Le concept n'a rien à perdre à attendre. */
  | { etat: "trop-tot"; possibleLe: Date };

/**
 * `reporter` : pour qui vient de retirer les questions, qu'un refus sec
 * laisserait sans question pour toujours. L'usure ne reporte pas : ses
 * questions servent encore, elle se redéclenchera au passage suivant.
 */
export type OptionsDeDemande = { reporter?: boolean };

export async function demanderDesQuestions(
  atome: { id: string; inputId: string },
  maintenant: Date = new Date(),
  options: OptionsDeDemande = {},
): Promise<DemandeDeQuestions> {
  if (await dejaEnFile(atome.id)) return { etat: "deja-en-file" };

  const regeneration = await aDejaEuDesQuestions(atome.id);
  const derniere = regeneration ? await derniereReecriture(atome.id) : null;

  if (assezEspacee(derniere, maintenant)) {
    const jobs = await creerJobsDeQuestions(atome.inputId, [atome.id], { regeneration });

    return { etat: "partie", jobs: jobs.map((job) => job.id) };
  }

  // `assezEspacee` a dit que `derniere` existe et est récente.
  const prochaine = new Date((derniere?.getTime() ?? maintenant.getTime()) + SEMAINE_MS);

  if (!options.reporter) return { etat: "trop-tot", possibleLe: prochaine };

  await creerJobsDeQuestions(atome.inputId, [atome.id], {
    partiraLe: prochaine,
    regeneration: true,
  });

  return { etat: "reportee", partiraLe: prochaine };
}
