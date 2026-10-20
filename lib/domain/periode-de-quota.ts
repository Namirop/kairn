import { jourEnDateUtc, jourLocal } from "./jour-local";

/**
 * Le plafond gratuit se compte sur un mois glissant depuis l'inscription : calé
 * sur le mois civil, une inscription le 28 ne donnerait que trois jours. En
 * étiquettes `AAAA-MM-JJ` locales, pour basculer au minuit de l'utilisateur.
 */

/** Début compris, fin exclue, au format `AAAA-MM-JJ`. */
export type PeriodeDeQuota = {
  debut: string;
  fin: string;
};

/**
 * Un ancrage au 31 bascule le dernier jour de février, puis retrouve son 31 :
 * glisser pour de bon au 28 ferait dériver l'ancrage.
 */
function jourAncre(annee: number, mois: number, ancre: number): number {
  const dernierDuMois = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();

  return Math.min(ancre, dernierDuMois);
}

function etiquette(annee: number, mois: number, jour: number): string {
  return new Date(Date.UTC(annee, mois, jour)).toISOString().slice(0, 10);
}

export function periodeDeQuota(
  inscription: Date,
  maintenant: Date,
  fuseau: string,
): PeriodeDeQuota {
  const jourInscription = jourLocal(inscription, fuseau);
  const aujourdhui = jourLocal(maintenant, fuseau);

  // Horloge qui recule : la première période ne précède jamais l'inscription.
  if (aujourdhui <= jourInscription) {
    return { debut: jourInscription, fin: moisSuivant(jourInscription, jourInscription) };
  }

  const ancre = Number.parseInt(jourInscription.slice(8, 10), 10);
  const [anneeCourante, moisCourant] = [
    Number.parseInt(aujourdhui.slice(0, 4), 10),
    Number.parseInt(aujourdhui.slice(5, 7), 10) - 1,
  ];

  const bascule = etiquette(
    anneeCourante,
    moisCourant,
    jourAncre(anneeCourante, moisCourant, ancre),
  );
  const debut =
    bascule <= aujourdhui
      ? bascule
      : etiquette(anneeCourante, moisCourant - 1, jourAncre(anneeCourante, moisCourant - 1, ancre));

  return { debut, fin: moisSuivant(debut, jourInscription) };
}

/** Depuis le jour d'ancrage et non du début reçu, qui a pu être ramené au 28. */
function moisSuivant(debut: string, jourInscription: string): string {
  const ancre = Number.parseInt(jourInscription.slice(8, 10), 10);
  const annee = Number.parseInt(debut.slice(0, 4), 10);
  const mois = Number.parseInt(debut.slice(5, 7), 10) - 1;

  return etiquette(annee, mois + 1, jourAncre(annee, mois + 1, ancre));
}

/** Sous la forme que stockent les colonnes `Date`. */
export function debutEnDate(periode: PeriodeDeQuota): Date {
  return jourEnDateUtc(periode.debut);
}
