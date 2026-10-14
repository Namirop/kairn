import { CairnDuPaysage } from "./cairn-du-paysage";
import { crete, teintesDe, terre } from "./geometrie";
import type { Plan } from "./plans";

/**
 * Un plan : ses cairns, puis sa terre par-dessus leurs pieds.
 *
 * L'ordre compte plus que le reste — c'est lui qui plante les pierres au lieu
 * de les poser. Le composant ne connaît ni la fenêtre ni le nombre de plans, il
 * dessine celui qu'on lui donne : c'est ce qui permet aux deux paysages, celui
 * de bureau et celui du téléphone, d'être deux jeux de valeurs et non deux
 * dessins à tenir en parallèle.
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
        {/* L'arête, sans quoi la butte n'existe pas.
            Deux terres voisines ne se séparent que de quelques centièmes de
            luminance : l'écart suffit à faire un plan, pas à faire une
            ligne, et le relief se devinait sans jamais se voir. Le trait la
            dessine. Il ne grossit pas avec la vue — elle est étirée en
            hauteur —, donc il reste le même cheveu partout, et sa teinte
            monte d'un cran quand le plan se rapproche. */}
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
