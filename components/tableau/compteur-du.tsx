import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Ce qui arrive à échéance aujourd'hui. Le chiffre est nu, souligné d'un filet
 * de lichen, et suivi de sa phrase — un nombre sans contexte ne dit rien.
 */
export function CompteurDu({ nombre, aDesAtoms }: { nombre: number; aDesAtoms: boolean }) {
  return (
    <section aria-labelledby="titre-aujourdhui">
      <h1
        id="titre-aujourdhui"
        className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase"
      >
        Aujourd&apos;hui
      </h1>

      <p className="mt-pas-4 font-display text-nombre leading-none font-medium tabular-nums">
        {nombre}
      </p>
      <span aria-hidden className="mt-pas-3 bg-lichen block h-0.5 w-10" />

      <p className="mt-pas-3 max-w-sm text-stone-500">
        {nombre === 0
          ? aDesAtoms
            ? "Rien n'arrive à échéance. Les prochains concepts reviendront d'eux-mêmes."
            : "Rien à revoir tant que tu n'as rien déposé."
          : `${nombre === 1 ? "concept arrive" : "concepts arrivent"} à échéance.`}
      </p>

      {nombre === 0 ? (
        // Rien à faire : le bouton reste, mort, plutôt que de disparaître et de
        // faire sauter la colonne d'un jour à l'autre.
        <Button size="lg" className="mt-pas-6 w-full sm:w-auto" disabled>
          Commencer
        </Button>
      ) : (
        <Button asChild size="lg" className="mt-pas-6 w-full sm:w-auto">
          <Link href={ROUTES.reviser}>Commencer</Link>
        </Button>
      )}
    </section>
  );
}
