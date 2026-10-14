import { jourEnDateUtc, jourLocal } from "./jour-local";

/**
 * Le mois d'un compte, qui n'est pas celui du calendrier.
 *
 * Le plafond gratuit se compte sur un mois glissant depuis l'inscription
 * (inscrit le 12, remis à zéro le 12) : calé sur le mois civil, une inscription
 * le 28 ne donnerait que trois jours. Rien ne se reporte d'une période à
 * l'autre.
 *
 * Calculé sur des étiquettes `AAAA-MM-JJ` dans le calendrier de l'utilisateur,
 * pour que la bascule tombe à son minuit et non à celui de l'UTC.
 */

/** Une période de quota, début compris, fin exclue. */
export type PeriodeDeQuota = {
  /** Premier jour de la période, au format `AAAA-MM-JJ`. */
  debut: string;
  /** Premier jour de la période suivante. C'est là que le compteur repart. */
  fin: string;
};

/**
 * Le jour d'ancrage, ramené à un mois qui ne le porte pas : un ancrage au 31
 * bascule le dernier jour de février, puis retrouve son 31. Glisser pour de bon
 * au 28 ferait dériver l'ancrage.
 */
function jourAncre(annee: number, mois: number, ancre: number): number {
  const dernierDuMois = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();

  return Math.min(ancre, dernierDuMois);
}

function etiquette(annee: number, mois: number, jour: number): string {
  return new Date(Date.UTC(annee, mois, jour)).toISOString().slice(0, 10);
}

/**
 * La période en cours pour ce compte. Les deux instants sont ramenés dans le
 * calendrier de l'utilisateur avant toute comparaison.
 */
export function periodeDeQuota(
  inscription: Date,
  maintenant: Date,
  fuseau: string,
): PeriodeDeQuota {
  const jourInscription = jourLocal(inscription, fuseau);
  const aujourdhui = jourLocal(maintenant, fuseau);

  // Une horloge qui recule, ou un compte lu avant son inscription : la première
  // période ne commence jamais avant l'inscription.
  if (aujourdhui <= jourInscription) {
    return { debut: jourInscription, fin: moisSuivant(jourInscription, jourInscription) };
  }

  const ancre = Number.parseInt(jourInscription.slice(8, 10), 10);
  const [anneeCourante, moisCourant] = [
    Number.parseInt(aujourdhui.slice(0, 4), 10),
    Number.parseInt(aujourdhui.slice(5, 7), 10) - 1,
  ];

  // Si le basculement de ce mois-ci est encore devant, la période courante a
  // commencé le mois d'avant.
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

/** Le basculement suivant, en repartant du jour d'ancrage et non du début reçu. */
function moisSuivant(debut: string, jourInscription: string): string {
  const ancre = Number.parseInt(jourInscription.slice(8, 10), 10);
  const annee = Number.parseInt(debut.slice(0, 4), 10);
  const mois = Number.parseInt(debut.slice(5, 7), 10) - 1;

  return etiquette(annee, mois + 1, jourAncre(annee, mois + 1, ancre));
}

/** La borne de la période, sous la forme que stockent les colonnes `Date`. */
export function debutEnDate(periode: PeriodeDeQuota): Date {
  return jourEnDateUtc(periode.debut);
}
