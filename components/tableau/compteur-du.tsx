import { Button } from "@/components/ui/button";

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

      <Button size="lg" className="mt-pas-6 w-full sm:w-auto" disabled={nombre === 0}>
        Commencer
      </Button>
    </section>
  );
}
