import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import type { ChargeDuJour } from "@/lib/domain/selection-session";

/**
 * Ce qu'il y a à revoir aujourd'hui. Le chiffre est nu, souligné d'un filet de
 * lichen, et suivi de sa phrase — un nombre sans contexte ne dit rien.
 *
 * Le chiffre affiché est celui de la session, pas celui de l'arriéré. Trente-huit
 * décourage sans rien apprendre : la session en servira vingt, et les dix-huit
 * autres reviennent demain sans que rien ne soit perdu. Le total reste dit, sous
 * le compteur, parce que le cacher serait mentir dans l'autre sens.
 *
 * « Arrive à échéance » était du jargon d'algorithme : c'est vrai du point de
 * vue de la carte ts-fsrs, pas de celui de quelqu'un qui ouvre son application
 * le matin.
 */
export function CompteurDu({
  charge,
  aDesAtoms,
  questionsEnRoute,
}: {
  charge: ChargeDuJour;
  aDesAtoms: boolean;
  /** Des concepts existent, mais leurs questions ne sont pas encore écrites. */
  questionsEnRoute: boolean;
}) {
  const { aujourdhui, enAttente } = charge;

  return (
    // Sur une colonne, tout se centre. En deux colonnes, tout revient au fer à
    // gauche : le bloc n'est plus seul dans la largeur, il ouvre une rangée, et
    // un texte centré à côté d'une liste alignée à gauche donne deux axes de
    // lecture pour un seul écran. Le point de bascule est celui de la grille.
    <section aria-labelledby="titre-aujourdhui" className="text-center md:text-left">
      <h1
        id="titre-aujourdhui"
        className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase"
      >
        Aujourd&apos;hui
      </h1>

      <p className="mt-pas-4 font-display text-nombre leading-none font-medium tabular-nums">
        {aujourdhui}
      </p>
      <span aria-hidden className="mt-pas-3 bg-lichen mx-auto block h-0.5 w-10 md:mx-0" />

      <p className="mt-pas-3 mx-auto max-w-sm text-stone-500 md:mx-0">
        {aujourdhui === 0
          ? aDesAtoms
            ? questionsEnRoute
              ? "Tes concepts sont là, leurs questions s'écrivent. Reviens dans un moment."
              : "Rien à revoir aujourd'hui. Les prochains concepts reviendront d'eux-mêmes."
            : "Rien à revoir tant que tu n'as rien déposé."
          : `${aujourdhui === 1 ? "concept à revoir" : "concepts à revoir"} aujourd'hui.`}
      </p>

      {enAttente > 0 ? (
        <p className="mt-pas-2 text-petit mx-auto max-w-sm text-stone-500 md:mx-0">
          {enAttente} de plus attendent leur tour. Une session s&apos;arrête à vingt : le reste
          revient demain, en commençant par ce qui risque le plus.
        </p>
      ) : null}

      {aujourdhui > 0 ? (
        <Button asChild size="lg" className="mt-pas-6 w-full md:w-auto">
          <Link href={ROUTES.reviser}>Commencer</Link>
        </Button>
      ) : aDesAtoms && !questionsEnRoute ? (
        // Le seul endroit où l'entraînement se propose de lui-même : quand la
        // session n'a rien à donner. Tant qu'il y a quelque chose à revoir,
        // c'est la session qui compte, et deux boutons côte à côte laisseraient
        // croire qu'ils se valent.
        <div className="mt-pas-6 flex flex-col items-center md:items-start">
          <Button asChild size="lg" variant="outline" className="w-full md:w-fit">
            <Link href={ROUTES.entrainement}>S&apos;entraîner</Link>
          </Button>
          <span className="mt-pas-2 text-petit max-w-sm text-stone-500">
            D&apos;autres questions sur les mêmes concepts. Ça ne change pas ton planning.
          </span>
        </div>
      ) : aDesAtoms ? null : (
        // Rien déposé : le geste qui manque est le dépôt, pas la révision.
        <Button asChild size="lg" className="mt-pas-6 w-full md:w-auto">
          <Link href={`${ROUTES.depots}/nouveau`}>Déposer quelque chose</Link>
        </Button>
      )}
    </section>
  );
}
