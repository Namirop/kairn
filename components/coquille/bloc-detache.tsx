import { cn } from "@/lib/fusion-des-classes";

/**
 * Un bloc qui se détache du flux, ouvert par un filet horizontal court — le
 * même geste, à la même mesure, que sous le compteur du jour. Pas de filet
 * vertical : c'est la forme d'une citation de documentation.
 *
 * Une seule forme ; c'est la couleur qui dit le registre (pierre ou alerte).
 */
export function BlocDetache({
  ton = "pierre",
  filetCentre = false,
  className,
  children,
}: {
  /** `alerte` pour ce qui prévient d'un défaut. `pierre` partout ailleurs. */
  ton?: "pierre" | "alerte";
  /**
   * Le filet se centre sur téléphone et revient à gauche à partir de `md`,
   * pour suivre un chapeau centré qui fait de même : sinon, deux axes de
   * lecture pour quatre lignes.
   */
  filetCentre?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <span
        aria-hidden
        className={cn(
          "mb-pas-3 block h-0.5 w-10",
          filetCentre && "mx-auto md:mx-0",
          ton === "alerte" ? "bg-alerte" : "bg-stone-300",
        )}
      />
      {children}
    </div>
  );
}
