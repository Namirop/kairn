import { cn } from "@/lib/fusion-des-classes";

/**
 * Ouvert par un filet court, le même que sous le compteur du jour. Pas de filet
 * vertical : c'est la forme d'une citation de documentation.
 */
export function BlocDetache({
  ton = "pierre",
  filetCentre = false,
  className,
  children,
}: {
  /** `alerte` pour ce qui prévient d'un défaut. */
  ton?: "pierre" | "alerte";
  /** Suit un chapeau centré sur téléphone : sinon, deux axes pour quatre lignes. */
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
