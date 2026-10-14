import { prisma } from "@/lib/db/client";
import { rendreDepot } from "@/lib/db/quota-depots";
import { lireFuseauUtilisateur } from "@/lib/db/reglages-du-compte";

/**
 * Comment un dépôt s'arrête, et qui paie quand il s'arrête mal. Trois fins à ne
 * pas confondre : **rejeté** (rien à retenir, la place du dépôt est due),
 * **en panne** (l'utilisateur n'y est pour rien, sa place lui revient),
 * **prêt** (il a ses concepts, même si des questions manquent).
 */

/**
 * Le dépôt s'arrête sur une panne — timeout, sortie illisible, plafond du
 * produit — et sa place de la période lui est rendue : il n'est pas l'auteur de
 * l'incident.
 *
 * La transition est conditionnelle : un dépôt déjà arrêté ne se rembourse pas
 * deux fois, même si un autre chemin l'a déjà arrêté.
 *
 * À réserver aux vraies casses : ce que le contenu ne porte pas (une URL nue)
 * relève de `marquerRejet`, sinon on annonce une panne du produit.
 */
export async function marquerEchec(inputId: string, motif: string): Promise<void> {
  const { count } = await prisma.input.updateMany({
    where: { id: inputId, status: { notIn: ["FAILED", "REJECTED"] } },
    data: { status: "FAILED", failureReason: motif, imageData: null, imageMediaType: null },
  });

  if (count === 1) await rembourserLaPlace(inputId);
}

/**
 * Rend à la période la place qu'un dépôt en panne avait prise.
 *
 * La période se recalcule à cet instant. Si la panne survient après la bascule
 * de période, le remboursement tombe sur une période où rien n'a été pris et la
 * clause `deposits > 0` de `rendreDepot` le laisse sans effet : on rate un
 * remboursement plutôt que d'en accorder un faux.
 */
async function rembourserLaPlace(inputId: string): Promise<void> {
  const depot = await prisma.input.findUnique({
    where: { id: inputId },
    select: { userId: true },
  });

  // Un dépôt anonyme n'a pris aucune place de compte.
  if (!depot?.userId) return;

  await rendreDepot(depot.userId, await lireFuseauUtilisateur(depot.userId));
}

/**
 * La chaîne a lu le dépôt et n'y a rien trouvé à retenir.
 *
 * Le motif vient du modèle et dit ce qui manquait : c'est ce qui apprend à mieux
 * déposer. Ne pas l'écraser par une phrase générique.
 */
export async function marquerRejet(inputId: string, motif: string): Promise<void> {
  await prisma.input.update({
    where: { id: inputId },
    data: { status: "REJECTED", failureReason: motif, imageData: null, imageMediaType: null },
  });
}

/**
 * Clôt le dépôt quand plus aucun job n'est en attente.
 *
 * Appelée à la fin de chaque travail, réussi ou non : c'est le seul endroit qui
 * décide qu'un dépôt cesse d'annoncer un travail en cours. Le motif ne sert que
 * si le dépôt s'arrête sans un seul concept.
 */
export async function marquerPretSiPlusRienEnAttente(
  inputId: string,
  motifSiVide = "Le découpage n'a rien donné.",
): Promise<boolean> {
  const restants = await prisma.generationJob.count({
    where: { inputId, status: { in: ["QUEUED", "RUNNING"] } },
  });

  if (restants > 0) return false;

  // Un dépôt déjà arrêté ne se rouvre pas : le découpage marque lui-même le
  // rejet puis termine son job normalement, et sans cette garde la clôture
  // effacerait le motif et rendrait le dépôt « prêt » sans un concept.
  const depot = await prisma.input.findUnique({ where: { id: inputId }, select: { status: true } });

  if (depot?.status === "FAILED" || depot?.status === "REJECTED") return false;

  const enEchec = await prisma.generationJob.count({ where: { inputId, status: "FAILED" } });
  const concepts = await prisma.atom.count({ where: { inputId } });

  // Des questions manquantes ne condamnent pas un dépôt qui a ses concepts.
  //
  // Les octets de l'image partent quoi qu'il arrive : `enregistrerTexteLu` et
  // `oublierImage` ne couvrent que les lectures allées au bout. Si l'appel lève
  // ou si le job est abandonné, c'est ici seulement que la capture s'efface.
  const enPanne = enEchec > 0 && concepts === 0;

  await prisma.input.update({
    where: { id: inputId },
    data: {
      imageData: null,
      imageMediaType: null,
      ...(enPanne
        ? { status: "FAILED" as const, failureReason: motifSiVide }
        : { status: "READY" as const }),
    },
  });

  // La garde ci-dessus a écarté un dépôt déjà arrêté : on ne rembourse qu'une fois.
  if (enPanne) await rembourserLaPlace(inputId);

  return true;
}
