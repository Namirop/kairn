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
  niveau,
  xp,
}: {
  consolides: number;
  graines: string[];
  streak: number;
  niveau: number;
  xp: number;
}) {
  return (
    <aside className="flex flex-col items-center">
      {/* Le cairn est l'élément signature, et il portait la taille d'une
          vignette au milieu du plus grand panneau de l'application. Il gagne un
          tiers de largeur sur grand écran — c'est la largeur qui le
          dimensionne, l'empilement étant plus large que haut tant qu'il compte
          peu de pierres. Le mobile ne bouge pas : il y tenait déjà l'écran. */}
      <div className="h-56 w-full max-w-56 md:h-[22rem] md:max-w-80">
        <Cairn nombre={consolides} graines={graines} clair />
      </div>

      <p className="mt-pas-4 md:mt-pas-6 text-petit text-center text-stone-300">
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

      {/* Le niveau se lit en prose, sous le cairn, et pas dans une carte à
          chiffre : il n'est pas actionnable, il n'a pas à être scanné. Trois
          tuiles côte à côte auraient donné trois fois le poids d'une donnée qui
          n'en mérite qu'un tiers — c'est le cairn qui porte la progression. */}
      {xp > 0 ? (
        <Tooltip>
          <TooltipTrigger className="mt-pas-3 text-mono rounded-galet font-mono text-stone-500 tabular-nums">
            Niveau {niveau} · {xp} XP
          </TooltipTrigger>
          <TooltipContent>
            Un point par question passée en session, un de plus quand tu retrouves un concept que tu
            avais raté. La justesse n&apos;entre pas dans le calcul.
          </TooltipContent>
        </Tooltip>
      ) : null}
    </aside>
  );
}
