import { PLAFOND_GRATUIT, PLAFOND_PAYANT } from "@/lib/domain/plafond-du-plan";
import { PRIX_ANNUEL, PRIX_MENSUEL } from "@/lib/domain/prix";
import { cn } from "@/lib/utils";

/**
 * Les deux offres, côte à côte.
 *
 * Deux colonnes parce qu'on achète en comparant, et qu'une comparaison sur deux
 * écrans n'en est pas une. C'est le seul endroit du produit où deux blocs de
 * même forme se répondent : ailleurs, une grille de cartes identiques serait le
 * signe qu'on n'a pas su hiérarchiser. Ici, l'égalité de forme est le propos —
 * ce qui diffère entre les deux doit sauter aux yeux, donc tout le reste doit
 * être identique.
 *
 * **Une seule ligne les sépare vraiment** : le nombre de concepts. Le dire est
 * plus honnête que d'aligner sept fonctions cochées des deux côtés pour donner
 * du volume à la colonne payante — et ça se vérifie, puisque rien d'autre dans
 * le produit ne lit le plan.
 *
 * Le filet de lichen désigne l'offre payante. C'est le seul accent de la page,
 * et il a une fonction : dire laquelle des deux colonnes est celle qu'on vend.
 */

export function Offres() {
  return (
    <div className="gap-pas-6 md:gap-pas-8 grid md:grid-cols-2">
      <Offre
        nom="Gratuit"
        prix="0 €"
        cadence="pour toujours"
        concepts={PLAFOND_GRATUIT}
        raison="De quoi savoir si la mémoire tient, avant de payer quoi que ce soit."
      />

      <Offre
        nom="Complet"
        prix={`${PRIX_MENSUEL} €`}
        cadence="par mois"
        second={`ou ${PRIX_ANNUEL} € par an, deux mois offerts`}
        concepts={PLAFOND_PAYANT}
        raison="De quoi alimenter un domaine entier — une documentation, un cours, une veille."
        vendue
      />
    </div>
  );
}

function Offre({
  nom,
  prix,
  cadence,
  second,
  concepts,
  raison,
  vendue = false,
}: {
  nom: string;
  prix: string;
  cadence: string;
  second?: string;
  concepts: number;
  raison: string;
  /** L'offre payante. Porte le seul accent de la page. */
  vendue?: boolean;
}) {
  return (
    <div
      className={cn(
        "pl-pas-4 gap-pas-4 flex flex-col border-l-2",
        vendue ? "border-lichen" : "border-stone-300",
      )}
    >
      <p className="text-mono font-mono tracking-wide text-stone-500 uppercase">{nom}</p>

      <p className="gap-pas-2 flex items-baseline">
        {/* La display porte les grands nombres, et un prix en est un. */}
        <span className="font-display text-h2-site leading-none font-bold tracking-[-0.02em]">
          {prix}
        </span>
        <span className="text-petit text-stone-500">{cadence}</span>
      </p>

      {second ? <p className="text-mono font-mono text-stone-500">{second}</p> : null}

      <p className="text-corps text-stone-900">
        {/* Le nombre est la seule chose qui distingue les deux offres : il porte
            donc le poids, et la phrase autour reste au corps courant. */}
        <span className="font-mono font-semibold tabular-nums">{concepts}</span> concepts par mois.
      </p>

      <p className="text-petit text-stone-500">{raison}</p>
    </div>
  );
}
