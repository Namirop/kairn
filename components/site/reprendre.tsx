import Link from "next/link";
import { Panneau } from "@/components/coquille/panneau";
import { Apparition, Temps } from "@/components/site/apparition";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Ce que le hero racontait aux gens connectés, désormais dans son propre
 * panneau, un pli plus bas. Le hero est le même pour tout le monde — titre et
 * cairn — et c'est ce qui reste en dessous qui change selon l'état.
 *
 * Il porte le même mouvement que le panneau d'essai — un titre bref et
 * impératif, une ligne de contexte, puis l'action —, mais dans son propre mot.
 * **Reprends** : personne qui a déjà un compte ne redécouvre le produit ici,
 * elle vient reprendre là où elle en était.
 */
export function Reprendre() {
  return (
    <Panneau surface="papier" mesure="colonne" aere>
      <Apparition>
        <Temps>
          <h2 className="font-display text-h1-app leading-[0.95] font-bold tracking-[-0.02em]">
            Reprends
          </h2>
        </Temps>

        <Temps>
          <p className="mt-pas-4 md:mt-pas-6 max-w-md text-stone-500">
            Ce que tu as déposé t&apos;attend, et revient quand il est sur le point de partir.
          </p>
        </Temps>

        <Temps>
          <Button asChild size="lg" className="mt-pas-8">
            <Link href={ROUTES.aujourdhui}>Aujourd&apos;hui</Link>
          </Button>
        </Temps>
      </Apparition>
    </Panneau>
  );
}
