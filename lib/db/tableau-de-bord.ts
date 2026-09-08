import { suivreLArriere, type ArriereSuivi } from "@/lib/db/arriere-de-revision";
import { prisma } from "@/lib/db/client";
import { listerDepots } from "@/lib/db/depots";
import { lireChargeDuJour } from "@/lib/db/session-du-jour";
import { ETATS_QUI_POSENT_UNE_PIERRE } from "@/lib/domain/etat-maitrise";
import type { ChargeDuJour } from "@/lib/domain/selection-session";
import type { UserStats } from "@/lib/db/types";
import type { DepotListe } from "@/lib/db/depots";

/**
 * Une seule lecture pour tout le tableau de bord. Les requêtes partent
 * ensemble : la page ne rend rien tant qu'elle n'a pas tout, autant ne pas les
 * enchaîner.
 */

export type TableauDeBord = {
  /** Ce que la session servira maintenant, et ce qu'elle reporte à demain. */
  charge: ChargeDuJour;
  /** Fuseau de l'utilisateur : toute échéance se lit dans son calendrier. */
  fuseau: string;
  stats: UserStats | null;
  /** Identifiants des Atoms consolidés : une pierre chacun. */
  grainesDuCairn: string[];
  depots: DepotListe[];
  totalAtoms: number;
  /** L'arriéré, et depuis quand. Ce qui décide si on le dit, et comment. */
  arriere: ArriereSuivi;
  /**
   * Combien de concepts n'ont pas encore une seule question.
   *
   * Un compte et non un drapeau : l'écran ne s'en servait que pour distinguer
   * deux écrans vides, et taisait donc le cas le plus déroutant — six concepts
   * découpés, trois questionnés, une session de trois et rien qui l'explique.
   */
  conceptsSansQuestions: number;
  /**
   * Le plafond de session de ce compte, et ce qu'il en a déjà consommé
   * aujourd'hui.
   *
   * Nécessaires tous les deux pour dire **pourquoi** des concepts attendent :
   * « une session s'arrête à vingt » était écrit en toutes lettres dans l'écran
   * alors que le plafond se règle, et ne disait pas que la journée était déjà
   * bien entamée — les deux seules choses qui répondent à la question qu'on se
   * pose en lisant ce chiffre.
   */
  plafond: number;
  faitsAujourdhui: number;
};

export async function lireTableauDeBord(
  userId: string,
  maintenant: Date = new Date(),
): Promise<TableauDeBord> {
  const [duJour, stats, consolides, depots, totalAtoms, sansQuestions] = await Promise.all([
    // Le même compte que celui de la session, et pas un compte parallèle : les
    // deux avaient divergé, l'accueil promettant cinq concepts là où la session
    // répondait « tu es à jour ». « Est dû » n'a qu'un seul endroit où vivre.
    lireChargeDuJour(userId, maintenant),
    prisma.userStats.findUnique({ where: { userId } }),
    prisma.atom.findMany({
      where: { userId, state: { in: ETATS_QUI_POSENT_UNE_PIERRE } },
      orderBy: { updatedAt: "asc" },
      select: { id: true },
    }),
    listerDepots(userId, 3),
    prisma.atom.count({ where: { userId } }),
    prisma.atom.count({ where: { userId, uncertain: false, variants: { none: {} } } }),
  ]);

  const { charge, plafond, faitsAujourdhui, fuseau } = duJour;
  const arriere = await suivreLArriere(userId, charge.enAttente > 0, fuseau, maintenant);

  return {
    charge,
    fuseau,
    stats,
    grainesDuCairn: consolides.map((atom) => atom.id),
    totalAtoms,
    depots,
    arriere,
    // Des concepts sans une seule question : le troisième écran vide, celui où
    // il n'y a rien à faire mais où rien n'est en panne non plus.
    conceptsSansQuestions: sansQuestions,
    plafond,
    faitsAujourdhui,
  };
}
