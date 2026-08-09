import Link from "next/link";
import { EtatVide } from "@/components/etats/etat-vide";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/auth/routes";
import type { DepotRecent } from "@/lib/db/tableau-de-bord";
import { anciennete } from "@/lib/domain/echeance";

/**
 * Ce que l'utilisateur a déposé récemment. L'état n'apparaît que quand il n'est
 * pas le cas nominal : un dépôt découpé sans incident ne s'annonce pas.
 */
function Etat({ depot }: { depot: DepotRecent }) {
  if (depot.status === "FAILED") return <Badge variant="alerte">Échec du découpage</Badge>;
  if (depot.status !== "READY") return <Badge variant="pose">Découpage en cours</Badge>;

  return (
    <span className="text-mono font-mono tracking-[0.06em] text-stone-500 tabular-nums">
      {depot.nombreAtoms} {depot.nombreAtoms === 1 ? "concept" : "concepts"}
    </span>
  );
}

export function ListeDepots({
  depots,
  maintenant,
  titre = "Ce que tu as déposé",
  avecLien = true,
}: {
  depots: DepotRecent[];
  maintenant: Date;
  /** Nul sur la page dédiée, où le titre de page dit déjà de quoi il s'agit. */
  titre?: string | null;
  avecLien?: boolean;
}) {
  return (
    <section>
      <div className="gap-pas-4 flex items-baseline justify-between">
        {titre ? (
          <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
            {titre}
          </h2>
        ) : (
          <span />
        )}
        {avecLien && depots.length > 0 ? (
          <Link
            href={ROUTES.depots}
            className="text-petit rounded-xs text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900"
          >
            Tout voir
          </Link>
        ) : null}
      </div>

      {depots.length === 0 ? (
        <div className="mt-pas-4">
          <EtatVide
            constat="Tu n'as encore rien déposé."
            contexte="Une phrase, un pavé collé, une capture d'écran — tout fait un point de départ."
          />
        </div>
      ) : (
        <ul className="mt-pas-4 max-w-3xl">
          {depots.map((depot) => (
            <li key={depot.id} className="py-pas-3 border-b border-stone-100 last:border-b-0">
              <p className="text-petit line-clamp-2">
                {depot.sourceType === "IMAGE" ? "Capture — " : null}
                {depot.apercu}
              </p>
              <p className="mt-pas-2 gap-pas-3 text-mono flex items-center text-stone-500">
                <Etat depot={depot} />
                <span aria-hidden>·</span>
                <span>{anciennete(depot.createdAt, maintenant)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
