import { PlanDuPaysage } from "./paysage/plan-du-paysage";
import { PLANS, PLANS_TELEPHONE } from "./paysage/plans";

/**
 * Le paysage de l'ouverture : deux terrasses de terrain, peuplées de cairns.
 *
 * Trois indices de profondeur :
 * - chaque plan a sa ligne d'appui, plus haute à mesure qu'il s'éloigne ;
 * - chaque plan dessine ses cairns puis son sol par-dessus, qui mord leur pied
 *   (l'occlusion) ; le sol de l'ouverture se pose en dernier sur l'ensemble ;
 * - le recul se joue en contraste, pas en transparence : l'encre se mêle vers
 *   `--ciel-teinte` par `color-mix`, jamais d'`opacity`.
 *
 * Sur téléphone, le paysage de bureau passerait sous le titre et au travers de
 * ses lettres évidées : il a ses propres plans, voir `PLANS_TELEPHONE` dans
 * `paysage/plans.ts`.
 */

/**
 * Les deux versions sont montées et l'affichage en choisit une : du SVG inerte,
 * sans mesure au montage, jamais en retard d'une rotation d'écran.
 */
export function PaysageDeCairns() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 md:hidden">
        {PLANS_TELEPHONE.map((plan, rang) => (
          <PlanDuPaysage key={plan.crete} plan={plan} graine={`paysage-tel-${rang}`} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 hidden md:block">
        {PLANS.map((plan, rang) => (
          <PlanDuPaysage key={plan.crete} plan={plan} graine={`paysage-${rang}`} />
        ))}
      </div>
    </>
  );
}
