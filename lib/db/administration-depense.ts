import { prisma } from "@/lib/db/client";
import { debutDuJourUtc, ilYA } from "@/lib/domain/fenetre-utc";
import { localDay } from "@/lib/domain/local-day";
import { coutSelonConventions } from "@/lib/domain/tarifs";

/**
 * La dépense du jour, lue au registre `AiCall`.
 *
 * Le jour est celui d'UTC, parce que c'est le calendrier du plafond d'appels :
 * une fenêtre calculée autrement ne recouvrirait pas les lignes qu'elle résume.
 *
 * Les échecs sont comptés et non écartés. Un appel qui échoue a pu consommer des
 * tokens et a pris sa place au plafond ; le masquer ferait croire à une dépense
 * plus faible qu'elle n'est, exactement le jour où quelque chose ne va pas.
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
 * Additionne deux coûts réels en propageant l'absence.
 *
 * Un total réel n'a de sens que si **toutes** ses composantes en ont un. Traiter
 * une absence comme un zéro ferait un total plus bas que la réalité, ce qui est
 * précisément l'erreur qu'un tableau de dépense ne doit pas commettre.
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
 * La dépense jour par jour, sur une fenêtre glissante.
 *
 * Le total du jour dit combien on a dépensé ; il ne dit pas si c'est habituel.
 * C'est la seule question à laquelle un chiffre seul ne répond jamais, et c'est
 * pour elle que cette série existe — trois centimes ne veulent rien dire tant
 * qu'on ne sait pas si les jours d'avant en faisaient trois ou trente.
 *
 * Les jours vides sont engendrés par la base, comme pour les volumes : une série
 * qui saute les jours sans appel dessinerait une dépense continue.
 *
 * La maille de groupement est le **jour et le modèle**, parce que la conversion
 * de tarif appartient à un modèle et à une date. On replie ensuite par jour.
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

    // Un jour sans appel arrive quand même, par la jointure ouverte : il porte
    // un modèle nul et des compteurs à zéro. Il doit rester dans la série.
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
 * La base rend une ligne par intention **et par modèle** : c'est la maille où la
 * conversion de tarif est juste, une remise appartenant à un modèle. On replie
 * ensuite par intention pour l'écran.
 */
export async function lireLaDepenseDuJour(maintenant: Date): Promise<BlocDepense> {
  const jour = localDay(maintenant, "UTC");
  const debut = debutDuJourUtc(maintenant);
  const fin = new Date(debut.getTime() + 24 * 60 * 60 * 1000);

  // La fenêtre est bornée des deux côtés. Sans borne haute, « le jour » veut dire
  // « depuis ce matin, et pour toujours » : c'est la même chose tant qu'on
  // regarde le présent, et c'est faux dès qu'on regarde une journée passée.
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
