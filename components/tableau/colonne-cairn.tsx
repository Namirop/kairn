import { Cairn } from "@/components/cairn/cairn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * L'élément signature et ce qu'il compte. Le streak est la seule occurrence
 * d'ember du produit ; il vit sous l'empilement, en petites capitales.
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
    <aside className="md:pl-pas-8 flex flex-col items-center border-stone-100 md:border-l">
      <div className="h-56 w-full max-w-56 md:h-72">
        <Cairn nombre={consolides} graines={graines} />
      </div>

      <p className="mt-pas-4 text-petit text-center text-stone-500">
        {consolides === 0
          ? "Le premier concept consolidé posera la première pierre."
          : `${consolides} ${consolides === 1 ? "concept consolidé" : "concepts consolidés"}`}
      </p>

      {streak > 0 ? (
        <Tooltip>
          <TooltipTrigger className="mt-pas-6 text-mono text-ember-deep rounded-xs font-mono tracking-[0.14em] uppercase">
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
