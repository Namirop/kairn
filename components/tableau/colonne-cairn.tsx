import { Cairn } from "@/components/cairn/cairn";
import { PierreAVenir } from "@/components/cairn/pierre-a-venir";

/**
 * L'empilement seul, sur le panneau de roche : pierres claires, sommet en
 * lichen. La série et le niveau sont dans `ProgressionDuCairn`, le décompte
 * contre le titre dans `TitreDuCairn`.
 *
 * La colonne descend un cran sous l'axe du texte : la masse visible du cairn
 * est en bas, sa boîte compte l'air au-dessus du sommet. La marge vaut le double
 * de la descente voulue, la rangée centrant ses colonnes en reprend la moitié.
 */
export function ColonneCairn({ retenus, graines }: { retenus: number; graines: string[] }) {
  return (
    <aside className="md:mt-pas-16 flex w-full flex-col items-center md:max-w-96">
      {/* À zéro, on marque la place de la première pierre (`PierreAVenir`),
          dans une boîte resserrée : une pierre seule est large et plate. */}
      {retenus === 0 ? (
        <div className="mx-auto h-28 w-full max-w-64 md:h-36 md:max-w-96">
          <PierreAVenir clair />
        </div>
      ) : (
        /* Le dessin donne sa hauteur : celle d'un empilement suit son nombre de
           pierres. C'est le SVG qui porte le ratio (`h-auto`, tiré du viewBox),
           pas un `aspect-ratio` sur la boîte : Safari iOS laisse cette hauteur à
           `auto` dans cette pile, et le SVG débordait sur la bande de
           progression. Les bornes `max-h` reprennent la main passé une dizaine
           de pierres. */
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
