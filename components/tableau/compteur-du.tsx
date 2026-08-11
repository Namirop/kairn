import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Ce qu'il y a à revoir aujourd'hui. Le chiffre est nu, souligné d'un filet de
 * lichen, et suivi de sa phrase — un nombre sans contexte ne dit rien.
 *
 * « Arrive à échéance » était du jargon d'algorithme : c'est vrai du point de
 * vue de la carte ts-fsrs, pas de celui de quelqu'un qui ouvre son application
 * le matin.
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
            ? "Rien à revoir aujourd'hui. Les prochains concepts reviendront d'eux-mêmes."
            : "Rien à revoir tant que tu n'as rien déposé."
          : `${nombre === 1 ? "concept à revoir" : "concepts à revoir"} aujourd'hui.`}
      </p>

      {nombre > 0 ? (
        <Button asChild size="lg" className="mt-pas-6 w-full sm:w-auto">
          <Link href={ROUTES.reviser}>Commencer</Link>
        </Button>
      ) : aDesAtoms ? (
        // Le seul endroit où l'entraînement se propose de lui-même : quand la
        // session n'a rien à donner. Tant qu'il y a quelque chose à revoir,
        // c'est la session qui compte, et deux boutons côte à côte laisseraient
        // croire qu'ils se valent.
        <div className="mt-pas-6 flex flex-col">
          <Button asChild size="lg" variant="outline" className="w-full sm:w-fit">
            <Link href={ROUTES.entrainement}>S&apos;entraîner</Link>
          </Button>
          <span className="mt-pas-2 text-petit max-w-sm text-stone-500">
            D&apos;autres questions sur les mêmes concepts. Ça ne change pas ton planning.
          </span>
        </div>
      ) : (
        // Rien déposé, donc rien à faire ici : le bouton reste, mort, plutôt
        // que de disparaître et de faire sauter la colonne d'un jour à l'autre.
        <Button size="lg" className="mt-pas-6 w-full sm:w-auto" disabled>
          Commencer
        </Button>
      )}
    </section>
  );
}
