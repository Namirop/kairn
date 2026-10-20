// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import { dollars, nombre } from "@/components/administration/formats";
import type { BlocComptes, BlocSignalements } from "@/lib/db/administration";
import type { BlocDepense } from "@/lib/db/administration-depense";
import { cn } from "@/lib/fusion-des-classes";

/**
 * Les quatre chiffres pour lesquels on ouvre cet écran, aucun repris plus bas :
 * une tuile qui répète son tableau n'est pas une synthèse. Sept jours pour les
 * deux derniers : à ce volume, un jour seul est du hasard. Plafond illisible :
 * le compte seul, jamais un plafond deviné.
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
  /** En vigueur, surcharges comprises ; `null` si la configuration est refusée. */
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
            // Les têtes de rangée, qui changent entre deux et quatre colonnes,
            // restent à fleur de marge, alignées sur le titre.
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
