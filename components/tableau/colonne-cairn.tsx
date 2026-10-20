import { Cairn } from "@/components/cairn/cairn";
import { PierreAVenir } from "@/components/cairn/pierre-a-venir";

/**
 * Un cran sous l'axe du texte : la masse du cairn est en bas, sa boîte compte
 * l'air au-dessus. La marge vaut le double de la descente, la rangée centrée
 * en reprend la moitié.
 */
export function ColonneCairn({ retenus, graines }: { retenus: number; graines: string[] }) {
  return (
    <aside className="md:mt-pas-16 flex w-full flex-col items-center md:max-w-96">
      {/* Boîte resserrée : une pierre seule est large et plate. */}
      {retenus === 0 ? (
        <div className="mx-auto h-28 w-full max-w-64 md:h-36 md:max-w-96">
          <PierreAVenir clair />
        </div>
      ) : (
        /* Le SVG porte le ratio (`h-auto`, tiré du viewBox), pas un
           `aspect-ratio` sur la boîte : Safari iOS y laisse la hauteur à `auto`
           et le SVG déborde sur la progression. `max-h` borne passé une
           dizaine de pierres. */
        <div className="mx-auto w-full max-w-64 md:max-w-96">
          <Cairn
            nombre={retenus}
            graines={graines}
            clair
            className="h-auto max-h-64 md:max-h-[26rem]"
          />
        </div>
      )}
    </aside>
  );
}
