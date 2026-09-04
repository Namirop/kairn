import { dayToUtcDate, localDay } from "./local-day";

/**
 * Le mois d'un compte, qui n'est pas celui du calendrier.
 *
 * Le plafond gratuit se compte sur un mois glissant **depuis l'inscription** :
 * quelqu'un qui s'inscrit le 12 voit son compteur repartir le 12 de chaque mois.
 * Un plafond calé sur le mois civil ferait qu'une inscription le 28 donne trois
 * jours de produit avant remise à zéro, ce qui est à la fois injuste et absurde
 * à expliquer.
 *
 * Les concepts non consommés ne se reportent pas. C'est ce qui distingue ce
 * découpage d'une simple fenêtre de trente jours glissants : il y a un début et
 * une fin, et ce qui n'a pas servi dans la période est perdu avec elle.
 *
 * Tout se calcule sur des étiquettes `AAAA-MM-JJ` dans le calendrier de
 * l'utilisateur. Un décompte mensuel qui basculerait à minuit UTC rendrait à
 * quelqu'un le quota de sa période au milieu de sa soirée, ou la veille au soir.
 */

/** Une période de facturation, bornes comprises pour le début, exclue pour la fin. */
export type PeriodeDeQuota = {
  /** Premier jour de la période, au format `AAAA-MM-JJ`. */
  debut: string;
  /** Premier jour de la période suivante. C'est là que le compteur repart. */
  fin: string;
};

/**
 * Le jour d'ancrage, ramené à un mois qui ne le porte pas.
 *
 * Une inscription le 31 janvier ancre au 31. Février n'a pas de 31 : la période
 * bascule alors le dernier jour du mois, et retrouve son 31 dès que le mois en
 * a un. Le contraire — glisser définitivement au 28 — ferait dériver la date
 * d'ancrage d'un compte de trois jours par an, sans que personne ne l'ait décidé.
 */
function jourAncre(annee: number, mois: number, ancre: number): number {
  const dernierDuMois = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();

  return Math.min(ancre, dernierDuMois);
}

function etiquette(annee: number, mois: number, jour: number): string {
  return new Date(Date.UTC(annee, mois, jour)).toISOString().slice(0, 10);
}

/**
 * La période en cours pour ce compte.
 *
 * `inscription` et `maintenant` sont des instants ; le fuseau les ramène tous
 * les deux dans le calendrier de l'utilisateur avant toute comparaison.
 */
export function periodeDeQuota(
  inscription: Date,
  maintenant: Date,
  fuseau: string,
): PeriodeDeQuota {
  const jourInscription = localDay(inscription, fuseau);
  const aujourdhui = localDay(maintenant, fuseau);

  // Une horloge qui recule, ou un compte lu avant son inscription : la première
  // période commence à l'inscription, elle ne commence jamais avant.
  if (aujourdhui <= jourInscription) {
    return { debut: jourInscription, fin: moisSuivant(jourInscription, jourInscription) };
  }

  const ancre = Number.parseInt(jourInscription.slice(8, 10), 10);
  const [anneeCourante, moisCourant] = [
    Number.parseInt(aujourdhui.slice(0, 4), 10),
    Number.parseInt(aujourdhui.slice(5, 7), 10) - 1,
  ];

  // Le basculement de ce mois-ci. S'il est encore devant, la période courante a
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
  return dayToUtcDate(periode.debut);
}
