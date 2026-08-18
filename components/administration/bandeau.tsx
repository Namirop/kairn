import { dollars, nombre } from "@/components/administration/formats";
import type { BlocComptes, BlocSignalements } from "@/lib/db/administration";
import type { BlocDepense } from "@/lib/db/administration-depense";
import { cn } from "@/lib/utils";

/**
 * Les quatre chiffres pour lesquels on ouvre cet écran.
 *
 * Aucun n'est repris tel quel plus bas, et c'est la règle qui décide de leur
 * contenu : une tuile qui répète la première ligne du tableau qu'elle surplombe
 * n'est pas une synthèse, c'est du remplissage. Les totaux de la dépense sont
 * donc redescendus en pied de tableau, et les deux mesures que le bandeau prend
 * aux comptes ont quitté leur liste.
 *
 * Chacun répond à une question qu'on se pose en arrivant : est-ce que ça coûte
 * cher aujourd'hui, est-ce qu'on approche du plafond, est-ce que les gens
 * reviennent, est-ce que les questions se sont mises à casser. Les deux
 * derniers sont pris sur sept jours et pas sur la journée : à ce volume, une
 * journée seule ne dit rien qu'on puisse distinguer du hasard.
 *
 * Le rapport au plafond est la seule mesure de l'écran qui soit un rapport et
 * non un compte. C'est voulu : « 38 appels » ne se juge pas, « 38 sur 150 » se
 * juge tout de suite, et c'est le seul chiffre de la page sur lequel on ait un
 * geste à faire — celui qui vit dans les réglages, plus bas.
 *
 * Quand la configuration ne se lit pas, ce dénominateur n'existe pas. La tuile
 * retombe alors sur le compte seul et le dit dans sa ligne de contexte : un
 * plafond deviné, ou un tiret qui ressemble à un plafond, se jugerait quand
 * même — et de travers.
 */

type Tuile = {
  intitule: string;
  valeur: string;
  contexte: string;
};

export function Bandeau({
  comptes,
  depense,
  signalements,
  plafond,
}: {
  comptes: BlocComptes;
  depense: BlocDepense;
  signalements: BlocSignalements;
  /**
   * Le plafond d'appels réellement en vigueur, surcharges comprises, ou `null`
   * si la configuration a été refusée.
   */
  plafond: number | null;
}) {
  const echecs = depense.echecs === 0 ? "aucun échec" : `dont ${nombre(depense.echecs)} en échec`;

  const tuiles: Tuile[] = [
    {
      intitule: "Dépense du jour",
      valeur: dollars(depense.coutReel ?? depense.coutCatalogue),
      contexte:
        depense.coutReel === null
          ? "au catalogue, faute de conversion"
          : `${dollars(depense.coutCatalogue)} au catalogue`,
    },
    {
      intitule: "Appels du jour",
      valeur:
        plafond === null
          ? nombre(depense.appels)
          : `${nombre(depense.appels)} / ${nombre(plafond)}`,
      contexte: plafond === null ? `${echecs}, plafond illisible` : echecs,
    },
    {
      intitule: "Actifs sur 7 jours",
      valeur: nombre(comptes.actifs7j),
      contexte: `sur ${nombre(comptes.total)} compte${comptes.total > 1 ? "s" : ""}`,
    },
    {
      intitule: "Signalements sur 7 jours",
      valeur: nombre(signalements.sur7j),
      contexte: `${nombre(signalements.total)} depuis l'ouverture`,
    },
  ];

  return (
    <dl className="grid grid-cols-2 border-y border-stone-300 lg:grid-cols-4">
      {tuiles.map((tuile, rang) => (
        <div
          key={tuile.intitule}
          className={cn(
            "py-pas-6 pr-pas-4 border-stone-300",
            // Les tuiles de tête de rangée restent à fleur de marge : elles
            // s'alignent sur le titre de la page, les autres se détachent par un
            // filet. La rangée change à deux colonnes comme à quatre.
            rang % 2 === 1 && "pl-pas-4 border-l",
            rang >= 2 && "border-t lg:border-t-0",
            rang > 0 && "lg:pl-pas-4 lg:border-l",
          )}
        >
          <dt className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
            {tuile.intitule}
          </dt>
          <dd className="mt-pas-2 text-h1-app font-mono text-stone-900 tabular-nums">
            {tuile.valeur}
          </dd>
          <dd className="mt-pas-1 text-petit text-stone-500">{tuile.contexte}</dd>
        </div>
      ))}
    </dl>
  );
}
