import { PlanDuPaysage } from "./paysage/plan-du-paysage";
import { PLANS, PLANS_TELEPHONE } from "./paysage/plans";

/**
 * Le paysage de l'ouverture : deux terrasses peuplées de cairns. Le sol de
 * chaque plan mord le pied de ses cairns, et le recul se joue en contraste
 * (`color-mix` vers `--ciel-teinte`), jamais en `opacity`.
 *
 * Les versions bureau et téléphone sont toutes deux montées, le CSS en choisit
 * une : du SVG inerte, sans mesure au montage, jamais en retard d'une rotation.
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
