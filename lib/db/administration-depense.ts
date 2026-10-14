import { prisma } from "@/lib/db/client";
import { debutDuJourUtc, ilYA } from "@/lib/domain/fenetre-utc";
import { jourLocal } from "@/lib/domain/jour-local";
import { coutSelonConventions } from "@/lib/domain/tarifs";

/**
 * La dépense, lue au registre `AiCall`. Le jour est celui d'UTC, calendrier du
 * plafond d'appels, pour recouvrir exactement les lignes qu'il résume.
 *
 * Les échecs sont comptés : un appel qui échoue a pu consommer des tokens et a
 * pris sa place au plafond.
 */

export type LigneDIntention = {
  intention: string;
  appels: number;
  echecs: number;
  entree: number;
  sortie: number;
  coutCatalogue: number;
  /** Nul quand un modèle de la ligne n'a pas de conversion par facteur unique. */
  coutReel: number | null;
};

export type LigneDeDepenseParJour = {
  jour: string;
  appels: number;
  echecs: number;
  coutCatalogue: number;
  coutReel: number | null;
};

export type BlocDepense = {
  jour: string;
  appels: number;
  echecs: number;
  entree: number;
  sortie: number;
  coutCatalogue: number;
  coutReel: number | null;
  parIntention: LigneDIntention[];
};

type LigneDAppels = {
  purpose: string;
  model: string;
  appels: number;
  echecs: number;
  entree: number;
  sortie: number;
  cout: number;
};

/**
 * Additionne deux coûts réels en propageant l'absence : traiter une absence
 * comme zéro sous-estimerait le total.
 */
function ajouterReel(cumul: number | null | undefined, ajout: number | null): number | null {
  if (cumul === null || ajout === null) return null;

  return (cumul ?? 0) + ajout;
}

type LigneDeJourEtModele = {
  jour: string;
  model: string | null;
  appels: number;
  echecs: number;
  cout: number;
};

/**
 * La dépense jour par jour sur une fenêtre glissante, pour dire si le chiffre
 * du jour est habituel.
 *
 * `generate_series` engendre les jours vides, qui doivent rester dans la série.
 * Groupé par jour et modèle, parce que la conversion de tarif dépend des deux,
 * puis replié par jour.
 */
export async function lireLaDepenseParJour(
  maintenant: Date,
  jours: number,
): Promise<LigneDeDepenseParJour[]> {
  const premier = debutDuJourUtc(ilYA(maintenant, jours - 1));
  const dernier = debutDuJourUtc(maintenant);

  const lignes = await prisma.$queryRaw<LigneDeJourEtModele[]>`
    SELECT
      to_char(j, 'YYYY-MM-DD') AS jour,
      a."model" AS model,
      count(a.*)::int AS appels,
      count(a.*) FILTER (WHERE NOT a."success")::int AS echecs,
      COALESCE(sum(a."costUsd"), 0)::float8 AS cout
    FROM generate_series(${premier}::timestamptz, ${dernier}::timestamptz, interval '1 day') AS j
    LEFT JOIN "AiCall" a ON a."createdAt" >= j AND a."createdAt" < j + interval '1 day'
    GROUP BY j, a."model"
    ORDER BY j DESC
  `;

  const parJour = new Map<string, LigneDeDepenseParJour>();

  for (const ligne of lignes) {
    const vide: LigneDeDepenseParJour = {
      jour: ligne.jour,
      appels: 0,
      echecs: 0,
      coutCatalogue: 0,
      coutReel: 0,
    };
    const cumul = parJour.get(ligne.jour) ?? vide;

    // Jour sans appel : la jointure ouverte le rend avec un modèle nul.
    if (ligne.model === null) {
      parJour.set(ligne.jour, cumul);
      continue;
    }

    const { catalogue, reel } = coutSelonConventions(ligne.cout, ligne.model, ligne.jour);

    parJour.set(ligne.jour, {
      jour: ligne.jour,
      appels: cumul.appels + ligne.appels,
      echecs: cumul.echecs + ligne.echecs,
      coutCatalogue: cumul.coutCatalogue + catalogue,
      coutReel: ajouterReel(cumul.coutReel, reel),
    });
  }

  return [...parJour.values()];
}

/**
 * La dépense du jour par intention. La base groupe par intention et par
 * modèle, maille où la conversion de tarif est juste, puis on replie.
 */
export async function lireLaDepenseDuJour(maintenant: Date): Promise<BlocDepense> {
  const jour = jourLocal(maintenant, "UTC");
  const debut = debutDuJourUtc(maintenant);
  const fin = new Date(debut.getTime() + 24 * 60 * 60 * 1000);

  // Bornée des deux côtés, pour rester juste sur une journée passée.
  const lignes = await prisma.$queryRaw<LigneDAppels[]>`
    SELECT
      "purpose", "model",
      count(*)::int AS appels,
      count(*) FILTER (WHERE NOT "success")::int AS echecs,
      COALESCE(sum("inputTokens" + "cacheCreationTokens" + "cacheReadTokens"), 0)::float8 AS entree,
      COALESCE(sum("outputTokens"), 0)::float8 AS sortie,
      COALESCE(sum("costUsd"), 0)::float8 AS cout
    FROM "AiCall"
    WHERE "createdAt" >= ${debut} AND "createdAt" < ${fin}
    GROUP BY "purpose", "model"
  `;

  const parIntention = new Map<string, LigneDIntention>();

  for (const ligne of lignes) {
    const { catalogue, reel } = coutSelonConventions(ligne.cout, ligne.model, jour);
    const cumul = parIntention.get(ligne.purpose);

    parIntention.set(ligne.purpose, {
      intention: ligne.purpose,
      appels: (cumul?.appels ?? 0) + ligne.appels,
      echecs: (cumul?.echecs ?? 0) + ligne.echecs,
      entree: (cumul?.entree ?? 0) + ligne.entree,
      sortie: (cumul?.sortie ?? 0) + ligne.sortie,
      coutCatalogue: (cumul?.coutCatalogue ?? 0) + catalogue,
      coutReel: ajouterReel(cumul?.coutReel, reel),
    });
  }

  const intentions = [...parIntention.values()].sort((a, b) => b.appels - a.appels);
  const somme = (lire: (ligne: LigneDIntention) => number) =>
    intentions.reduce((total, ligne) => total + lire(ligne), 0);

  return {
    jour,
    appels: somme((ligne) => ligne.appels),
    echecs: somme((ligne) => ligne.echecs),
    entree: somme((ligne) => ligne.entree),
    sortie: somme((ligne) => ligne.sortie),
    coutCatalogue: somme((ligne) => ligne.coutCatalogue),
    coutReel: intentions.reduce<number | null>(
      (total, ligne) => ajouterReel(total, ligne.coutReel),
      0,
    ),
    parIntention: intentions,
  };
}
