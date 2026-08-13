import { lireLAdministration } from "@/lib/db/administration";
import { prisma } from "@/lib/db/client";
import { localDay } from "@/lib/domain/local-day";
import { record } from "./journal";

/**
 * Les chiffres de l'écran d'administration, éprouvés contre la base.
 *
 * Ce que ces cas attrapent, aucun test unitaire ne le peut : les trois lectures
 * sont du SQL écrit à la main, avec des `generate_series`, des `FILTER` et des
 * conversions de type. Une colonne renommée, un cast qui rend une chaîne au lieu
 * d'un nombre, un `count` qui revient en `BigInt` — tout cela compile, passe le
 * typage, et ne casse qu'à l'exécution, sur un écran qu'on ouvre une fois par
 * semaine.
 */

/** Les lectures tournent et rendent des nombres, pas des chaînes ni des BigInt. */
export async function casChiffresLisibles(maintenant: Date): Promise<void> {
  const { comptes, depense } = await lireLAdministration(maintenant);

  const entiers = [
    comptes.total,
    comptes.nouveaux7j,
    comptes.actifs30j,
    comptes.seriesEnCours,
    depense.appels,
    depense.echecs,
  ];

  record(
    "Administration — les compteurs sont des nombres finis",
    entiers.every((valeur) => typeof valeur === "number" && Number.isFinite(valeur)),
    entiers.join(", "),
  );

  record(
    "Administration — le total des comptes couvre les inscriptions récentes",
    comptes.total >= comptes.nouveaux30j && comptes.nouveaux30j >= comptes.nouveaux7j,
    `${comptes.total} au total, ${comptes.nouveaux30j} sur 30 j, ${comptes.nouveaux7j} sur 7 j`,
  );

  record(
    "Administration — les actifs ne dépassent jamais les comptes existants",
    comptes.actifs30j <= comptes.total && comptes.actifs7j <= comptes.actifs30j,
    `${comptes.actifs7j} sur 7 j, ${comptes.actifs30j} sur 30 j, ${comptes.total} comptes`,
  );

  record(
    "Administration — la dépense est datée du jour UTC",
    depense.jour === localDay(maintenant, "UTC"),
    depense.jour,
  );

  record(
    "Administration — le coût réel ne dépasse pas le coût catalogue",
    depense.coutReel === null || depense.coutReel <= depense.coutCatalogue + 1e-9,
    `catalogue ${depense.coutCatalogue.toFixed(4)} $, réel ${depense.coutReel?.toFixed(4) ?? "—"} $`,
  );
}

/**
 * Le tableau des volumes montre les jours vides.
 *
 * C'est la raison d'être du `generate_series` : une série qui saute les jours
 * sans dépôt se lit comme une activité continue, et c'est précisément le
 * contresens qu'un tableau de bord ne doit pas induire.
 */
export async function casJoursVidesMontres(maintenant: Date): Promise<void> {
  const { volumes } = await lireLAdministration(maintenant);

  record(
    "Administration — quatorze jours sont rendus, jours vides compris",
    volumes.length === 14,
    `${volumes.length} jour(s)`,
  );

  record(
    "Administration — les jours vont du plus récent au plus ancien",
    volumes.every((ligne, rang) => rang === 0 || ligne.jour < volumes[rang - 1]!.jour),
    volumes.length > 0 ? `${volumes[0]?.jour} → ${volumes.at(-1)?.jour}` : "aucun",
  );

  const sansDepot = volumes.filter((ligne) => ligne.depots === 0);

  record(
    "Administration — un jour sans dépôt n'a pas de moyenne, et pas zéro",
    sansDepot.every((ligne) => ligne.moyenne === null),
    `${sansDepot.length} jour(s) sans dépôt`,
  );
}

/**
 * La moyenne de concepts par dépôt dit bien ce qu'elle prétend.
 *
 * Le cas fabrique un dépôt et ses concepts sur le jour courant, puis relit le
 * tableau : c'est le seul moyen de vérifier que la division porte sur les bonnes
 * lignes, et pas sur deux jours voisins.
 */
export async function casMoyenneCalculee(userId: string, maintenant: Date): Promise<void> {
  const depot = await prisma.input.create({
    data: {
      userId,
      sourceType: "TEXT",
      rawContent: "Vérification de la moyenne de concepts par dépôt.",
      status: "READY",
      createdAt: maintenant,
      atoms: {
        create: [
          { userId, concept: "Premier concept", createdAt: maintenant },
          { userId, concept: "Second concept", createdAt: maintenant },
          { userId, concept: "Troisième concept", createdAt: maintenant },
        ],
      },
    },
    select: { id: true },
  });

  try {
    const { volumes } = await lireLAdministration(maintenant);
    const aujourdhui = volumes.find((ligne) => ligne.jour === localDay(maintenant, "UTC"));

    record(
      "Administration — le jour courant compte le dépôt et ses trois concepts",
      aujourdhui !== undefined && aujourdhui.depots >= 1 && aujourdhui.concepts >= 3,
      `${aujourdhui?.depots ?? 0} dépôt(s), ${aujourdhui?.concepts ?? 0} concept(s)`,
    );

    record(
      "Administration — la moyenne existe dès qu'il y a un dépôt",
      aujourdhui?.moyenne !== null && aujourdhui?.moyenne !== undefined,
      aujourdhui?.moyenne?.toFixed(1) ?? "—",
    );
  } finally {
    await prisma.input.delete({ where: { id: depot.id } });
  }
}
