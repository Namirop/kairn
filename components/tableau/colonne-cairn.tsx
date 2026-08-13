import { Cairn } from "@/components/cairn/cairn";
import { PierreAVenir } from "@/components/cairn/pierre-a-venir";

/**
 * L'élément signature et ce qu'il compte.
 *
 * Il vit sur le panneau de roche — l'un des deux de toute l'application. Les
 * pierres s'y inversent en gris clairs, et le sommet garde son lichen : c'est
 * la constante de l'identité, et la seule occurrence d'accent sur ce panneau.
 *
 * La colonne ne porte plus que l'empilement et son décompte. La série et le
 * niveau sont descendus en bande sous les deux colonnes — voir
 * `ProgressionDuCairn` : ils y ont la largeur qui leur manquait, et le cairn
 * retrouve la hauteur du texte qu'il accompagne.
 */
export function ColonneCairn({ consolides, graines }: { consolides: number; graines: string[] }) {
  return (
    <aside className="flex w-full flex-col items-center md:max-w-80">
      {/* Le cairn est l'élément signature, et il portait la taille d'une
          vignette au milieu du plus grand panneau de l'application. Il gagne un
          tiers de largeur sur grand écran — c'est la largeur qui le
          dimensionne, l'empilement étant plus large que haut tant qu'il compte
          peu de pierres. Le mobile ne bouge pas : il y tenait déjà l'écran. */}
      {/* À zéro, le cairn ne rendait qu'un trait de sol au milieu du panneau :
          l'élément signature du produit y était un vide. On marque la place de
          la première pierre plutôt que d'en offrir une — voir `PierreAVenir`.

          La boîte se resserre en même temps. Une pierre seule est large et
          plate ; lui garder la hauteur d'un empilement de douze rendait le même
          vide qu'avant, avec un contour au milieu. Ce qui occupe la place, c'est
          la pile quand elle existe, pas la réserve qu'on lui garde. */}
      {consolides === 0 ? (
        <div className="h-24 w-full max-w-56 md:h-32 md:max-w-80">
          <PierreAVenir clair />
        </div>
      ) : (
        <div className="h-56 w-full max-w-56 md:h-[22rem] md:max-w-80">
          <Cairn nombre={consolides} graines={graines} clair />
        </div>
      )}

      <p className="mt-pas-4 md:mt-pas-6 text-petit text-center text-stone-300">
        {consolides === 0
          ? "Le premier concept consolidé posera la première pierre."
          : `${consolides} ${consolides === 1 ? "concept consolidé" : "concepts consolidés"}`}
      </p>
    </aside>
  );
}
