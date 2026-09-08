import { cn } from "@/lib/utils";

/**
 * Un bloc qui se détache du flux, ouvert par un filet horizontal court.
 *
 * **Il remplace le filet vertical de lichen**, qui longeait huit blocs du
 * produit pour cinq intentions différentes — distinguer, lister, alerter,
 * signaler une dette, marquer une offre. Trois défauts s'y empilaient. Le
 * lichen est l'accent unique et il était dépensé en bordure décorative, si bien
 * qu'il ne signalait plus rien nulle part. Un trait qui court sur cinq lignes
 * est la forme exacte du bloc de citation d'une documentation, et c'est ce qui
 * le faisait lire comme un motif générique plutôt que comme une décision. Et il
 * était redondant : presque tous ces blocs portent déjà leur libellé en petites
 * capitales, qui les annonce.
 *
 * Le filet passe donc à l'horizontale et se raccourcit : il **ouvre** le bloc au
 * lieu de le border. C'est le geste qui existe déjà sous le compteur du jour, à
 * la même mesure, et il lit comme une couche qui commence — la métaphore du
 * produit prise au mot.
 *
 * **Une seule forme, et c'est sa couleur qui dit le registre.** Le gris de
 * pierre pose un bloc à part ; la couleur d'alerte pose un bloc à part qui
 * alerte. Un second dessin pour les alertes aurait rendu au produit le problème
 * qu'on vient de lui retirer : deux marqueurs pour une seule séparation.
 *
 * Le filet est un `span` et non un pseudo-élément, comme celui du compteur :
 * c'est la même chose dessinée deux fois dans le produit, autant qu'elle
 * s'écrive pareil.
 */
export function BlocDetache({
  ton = "pierre",
  className,
  children,
}: {
  /** `alerte` pour ce qui prévient d'un défaut. `pierre` partout ailleurs. */
  ton?: "pierre" | "alerte";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <span
        aria-hidden
        className={cn("mb-pas-3 block h-0.5 w-10", ton === "alerte" ? "bg-alerte" : "bg-stone-300")}
      />
      {children}
    </div>
  );
}
