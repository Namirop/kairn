import { Cairn } from "@/components/cairn/cairn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * L'élément signature et ce qu'il compte.
 *
 * Il vit sur le panneau de roche — l'un des deux de toute l'application. Les
 * pierres s'y inversent en gris clairs, et le sommet garde son lichen : c'est
 * la constante de l'identité, et la seule occurrence d'accent sur ce panneau.
 *
 * Le streak est la seule occurrence d'ember du produit ; il vit sous
 * l'empilement, en petites capitales.
 */
export function ColonneCairn({
  consolides,
  graines,
  streak,
}: {
  consolides: number;
  graines: string[];
  streak: number;
}) {
  return (
    <aside className="flex flex-col items-center">
      <div className="h-56 w-full max-w-56 md:h-72">
        <Cairn nombre={consolides} graines={graines} clair />
      </div>

      <p className="mt-pas-4 text-petit text-center text-stone-300">
        {consolides === 0
          ? "Le premier concept consolidé posera la première pierre."
          : `${consolides} ${consolides === 1 ? "concept consolidé" : "concepts consolidés"}`}
      </p>

      {streak > 0 ? (
        <Tooltip>
          <TooltipTrigger className="mt-pas-6 text-mono text-ember rounded-galet font-mono tracking-[0.14em] uppercase">
            {streak} {streak === 1 ? "jour" : "jours"} d&apos;affilée
          </TooltipTrigger>
          <TooltipContent>
            Nombre de jours consécutifs avec au moins un passage, dans ton fuseau horaire.
          </TooltipContent>
        </Tooltip>
      ) : null}
    </aside>
  );
}
