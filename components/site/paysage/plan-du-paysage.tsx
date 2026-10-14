import { CairnDuPaysage } from "./cairn-du-paysage";
import { crete, teintesDe, terre } from "./geometrie";
import type { Plan } from "./plans";

/**
 * Un plan : ses cairns, puis sa terre par-dessus leurs pieds — c'est cet ordre
 * qui plante les pierres au lieu de les poser. Le composant ignore la fenêtre :
 * bureau et téléphone sont deux jeux de valeurs, pas deux dessins.
 */
export function PlanDuPaysage({ plan, graine }: { plan: Plan; graine: string }) {
  return (
    <div
      className="montee-du-plan absolute inset-0"
      style={{ animationDelay: `${plan.arrivee}ms` }}
    >
      {plan.cairns.map((cairn, index) => (
        <div
          className="absolute"
          key={cairn.gauche}
          /* Le pied passe sous la crête : deux points de la hauteur du
             panneau suffisent à ce que la terre le recouvre. */
          style={{
            left: cairn.gauche,
            bottom: `${(plan.crete * 100 - 2).toFixed(1)}%`,
            height: cairn.haut,
          }}
        >
          <CairnDuPaysage
            graine={`${graine}-${index}`}
            pierres={cairn.pierres}
            teintes={teintesDe(plan.pierre, plan.pierres)}
            sommet={`${plan.pierres}-sommet`}
          />
        </div>
      ))}

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 1000"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d={crete(plan).masse} fill={terre(plan.sol)} />
        {/* L'arête : deux terres voisines ne diffèrent que de quelques
            centièmes de luminance, le trait rend le relief visible.
            `non-scaling-stroke`, car la vue est étirée en hauteur. */}
        <path
          d={crete(plan).ligne}
          fill="none"
          stroke={plan.arete}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
