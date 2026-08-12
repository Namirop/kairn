import { prisma } from "@/lib/db/client";
import { creerJobsDeQuestions } from "@/lib/db/lots";
import { assezEspacee, JOURS_ENTRE_REGENERATIONS } from "@/lib/domain/rotation-variantes";

/**
 * Le seul endroit d'où l'on peut redemander les questions d'un concept.
 *
 * Il y avait trois chemins vers `creerJobsDeQuestions` — le seuil d'usure, la
 * modification, la confirmation d'un concept douteux — et un seul passait par
 * le plafond hebdomadaire. Les deux autres ouvraient une boucle : vingt clics
 * sur « modifier » achetaient vingt appels, de quoi fermer la journée du
 * produit pour tout le monde. Une règle qu'un seul chemin peut contourner n'est
 * pas une règle.
 *
 * Le découpage d'un dépôt ne passe pas par ici, et c'est voulu : ses concepts
 * n'ont jamais eu de questions, il n'y a rien à plafonner, et il groupe trois
 * concepts par appel là où cette fonction en sert un seul.
 */

/**
 * Ce concept a-t-il déjà eu des questions ?
 *
 * C'est la question qui sépare une réécriture d'un premier jeu — retirées
 * comprises, puisque `relancerLesQuestions` les retire juste avant d'appeler
 * ici. Un concept douteux qu'on confirme n'en a jamais eu : ses questions
 * arrivent par ce chemin, mais elles sont sa première fois, pas sa deuxième.
 */
async function aDejaEuDesQuestions(atomId: string): Promise<boolean> {
  return (await prisma.variant.count({ where: { atomId } })) > 0;
}

/**
 * Quand ce concept a consommé sa place hebdomadaire pour la dernière fois.
 *
 * On lit les jobs et non les questions écrites : c'est la dépense qu'on
 * plafonne, pas le résultat. Un job qui a échoué a quand même coûté un appel.
 *
 * Seules les réécritures comptent. Le premier jeu de questions d'un concept
 * n'est pas une réécriture, et le compter revenait à interdire pendant une
 * semaine la correction qui suit un dépôt — le geste le plus normal du produit,
 * puni comme un abus.
 *
 * `notBefore` prime sur `createdAt` quand il existe : une demande reportée est
 * écrite aujourd'hui mais ne dépense qu'au jour où elle part, et c'est ce
 * jour-là qui ouvre la fenêtre suivante.
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
  /** Le job est écrit et prêt : à l'appelant de le déclencher s'il est pressé. */
  | { etat: "partie"; jobs: string[] }
  /** Le job est écrit et attend la date où il devient légitime. */
  | { etat: "reportee"; partiraLe: Date }
  /** Une demande attend déjà pour ce concept : on n'en empile pas une seconde. */
  | { etat: "deja-en-file" }
  /** Trop tôt, et le concept n'a rien à perdre à attendre qu'on redemande. */
  | { etat: "trop-tot"; possibleLe: Date };

/**
 * Ce qu'on fait d'une demande que le plafond hebdomadaire refuse.
 *
 * `reporter` sert les chemins qui viennent de retirer les questions du concept :
 * là, refuser sans rien écrire laisserait le concept sans une seule question,
 * pour toujours, sans que rien ne vienne jamais y remédier. La demande est donc
 * écrite avec sa date et part toute seule ce jour-là.
 *
 * Le seuil d'usure, lui, ne reporte pas. Ses questions existent encore et
 * fonctionnent : rien n'est cassé, et il se redéclenchera de lui-même au
 * passage suivant. Écrire une demande différée reviendrait à payer dans une
 * semaine le renouvellement d'un concept que la personne aura peut-être arrêté
 * de travailler — on ne dépense que pour un usage constaté.
 */
export type OptionsDeDemande = { reporter?: boolean };

/**
 * Demande des questions pour un concept, ou dit quand elles viendront.
 */
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

  // `assezEspacee` vient de dire que `derniere` existe et qu'elle est récente.
  const prochaine = new Date((derniere?.getTime() ?? maintenant.getTime()) + SEMAINE_MS);

  if (!options.reporter) return { etat: "trop-tot", possibleLe: prochaine };

  await creerJobsDeQuestions(atome.inputId, [atome.id], {
    partiraLe: prochaine,
    regeneration: true,
  });

  return { etat: "reportee", partiraLe: prochaine };
}
