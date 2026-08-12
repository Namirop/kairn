import { prisma } from "@/lib/db/client";
import { rendreDepot } from "@/lib/db/quota-depots";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";

/**
 * Comment un dépôt s'arrête, et qui paie quand il s'arrête mal.
 *
 * Trois fins, et les confondre était le vrai bug. **Rejeté** : la chaîne a
 * tourné et conclu qu'il n'y avait rien à retenir — l'appel est dû, la place du
 * dépôt aussi. **En panne** : quelque chose s'est cassé, et l'utilisateur n'y est
 * pour rien — tout lui revient. **Prêt** : il a ses concepts, même si ses
 * questions manquent.
 *
 * Séparé de l'écriture du pipeline parce que ce n'est pas la même décision :
 * l'un range ce qui arrive, l'autre tranche ce qu'on facture.
 */

/**
 * Le dépôt s'arrête sur une panne, et sa place lui est rendue.
 *
 * **La règle du remboursement est : qui a payé l'appel.** Un rejet a fait
 * tourner le modèle — la place du dépôt est due, et seuls les concepts, qui
 * n'existent pas, ne sont pas comptés. Une panne n'a rien fait tourner du côté
 * de l'utilisateur : timeout, sortie illisible, plafond du produit atteint. Lui
 * facturer une de ses quinze places pour un incident dont il n'est pas l'auteur
 * est le plus sûr moyen de le perdre, et quinze incidents lui prenaient sa
 * journée sans qu'il ait rien retenu.
 *
 * La transition fait foi, et elle est conditionnelle : un dépôt déjà arrêté ne
 * se rembourse pas une seconde fois. C'est ce qui rend la fonction sûre à
 * appeler depuis les deux chemins qui arrêtent un dépôt.
 *
 * À réserver aux vraies casses. Ce que le contenu ne porte pas relève de
 * `marquerRejet` — appeler ça un échec revient à annoncer une panne du produit
 * à quelqu'un qui a simplement collé une URL nue.
 */
export async function marquerEchec(inputId: string, motif: string): Promise<void> {
  const { count } = await prisma.input.updateMany({
    where: { id: inputId, status: { notIn: ["FAILED", "REJECTED"] } },
    data: { status: "FAILED", failureReason: motif, imageData: null, imageMediaType: null },
  });

  if (count === 1) await rembourserLaPlace(inputId);
}

/**
 * Rend au compteur du jour la place qu'un dépôt en panne avait prise.
 *
 * Le jour se recalcule à cet instant, comme partout ailleurs. Si la panne
 * survient après le minuit de l'utilisateur, le remboursement tombe sur une
 * journée où il n'a rien pris et la clause `generations > 0` le laisse sans
 * effet : on rate un remboursement plutôt que d'en accorder un faux.
 */
async function rembourserLaPlace(inputId: string): Promise<void> {
  const depot = await prisma.input.findUnique({
    where: { id: inputId },
    select: { userId: true },
  });

  if (!depot) return;

  await rendreDepot(depot.userId, await lireFuseauUtilisateur(depot.userId));
}

/**
 * La chaîne a lu le dépôt et n'y a rien trouvé à retenir.
 *
 * Le motif vient du modèle, à la deuxième personne, et dit ce qui manquait. Il
 * est la seule chose de valeur que produise un rejet : c'est lui qui apprend à
 * mieux déposer la fois suivante, et l'écraser par une phrase générique
 * revenait à jeter ce qu'on venait de payer.
 */
export async function marquerRejet(inputId: string, motif: string): Promise<void> {
  await prisma.input.update({
    where: { id: inputId },
    data: { status: "REJECTED", failureReason: motif, imageData: null, imageMediaType: null },
  });
}

/**
 * Prêt : les concepts sont écrits et plus aucune question n'est attendue.
 *
 * Appelée à chaque fois qu'un travail se termine, réussi ou non : c'est le seul
 * endroit qui décide qu'un dépôt cesse d'annoncer un travail en cours. Le motif
 * ne sert que si le dépôt s'arrête sans avoir produit un seul concept.
 */
export async function marquerPretSiPlusRienEnAttente(
  inputId: string,
  motifSiVide = "Le découpage n'a rien donné.",
): Promise<boolean> {
  const restants = await prisma.generationJob.count({
    where: { inputId, status: { in: ["QUEUED", "RUNNING"] } },
  });

  if (restants > 0) return false;

  // Un dépôt déjà arrêté avec son motif ne se rouvre pas. Le découpage marque
  // lui-même le rejet quand il n'y a rien à retenir — puis son job se termine
  // normalement, puisqu'il a fait son travail. Sans cette garde, la clôture qui
  // suit effacerait le motif et rendrait le dépôt « prêt » sans un concept.
  const depot = await prisma.input.findUnique({ where: { id: inputId }, select: { status: true } });

  if (depot?.status === "FAILED" || depot?.status === "REJECTED") return false;

  const enEchec = await prisma.generationJob.count({ where: { inputId, status: "FAILED" } });
  const concepts = await prisma.atom.count({ where: { inputId } });

  // Des questions manquantes ne condamnent pas un dépôt qui a ses concepts :
  // ce qui a coûté un appel reste, et l'écran dira ce qui manque.
  //
  // Les octets de l'image, eux, partent quoi qu'il arrive. `enregistrerTexteLu`
  // et `oublierImage` ne couvrent que les chemins où la lecture est allée au
  // bout ; si l'appel lève, ou si le job est abandonné après trois reprises,
  // c'est ici — et nulle part ailleurs — que le dépôt cesse d'attendre. La
  // capture d'un utilisateur ne doit pas survivre précisément à l'échec.
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

  // Le dépôt s'arrête sans avoir rien produit, et par une panne : sa place lui
  // revient. La garde ci-dessus a déjà écarté un dépôt déjà arrêté, donc on ne
  // rembourse qu'une fois.
  if (enPanne) await rembourserLaPlace(inputId);

  return true;
}
