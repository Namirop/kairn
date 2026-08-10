import Link from "next/link";
import { EtatVide } from "@/components/etats/etat-vide";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/auth/routes";
import type { DepotListe } from "@/lib/db/depots";
import { anciennete } from "@/lib/domain/echeance";
import { conceptsLisibles, libelleEtat } from "@/lib/domain/etat-depot";

/**
 * Ce que l'utilisateur a déposé. L'étape n'apparaît que tant qu'elle a quelque
 * chose à annoncer : un dépôt prêt affiche ce qu'il a produit, pas son état.
 *
 * Le compte de concepts s'affiche dès qu'il existe, sans attendre les
 * questions — c'est le retour qui dit que le geste a servi à quelque chose.
 */
function Avancement({ depot }: { depot: DepotListe }) {
  const concepts = `${depot.nombreAtoms} ${depot.nombreAtoms === 1 ? "concept" : "concepts"}`;

  if (depot.etat === "echec") return <Badge variant="alerte">Échec</Badge>;

  if (depot.etat === "pret") {
    return <span className="font-mono tabular-nums">{concepts}</span>;
  }

  return (
    <>
      {conceptsLisibles(depot.etat) ? (
        <span className="font-mono tabular-nums">{concepts}</span>
      ) : null}
      <Badge variant="pose">{libelleEtat(depot.etat)}</Badge>
    </>
  );
}

export function ListeDepots({
  depots,
  maintenant,
  fuseau,
  titre = "Ce que tu as déposé",
  avecLien = true,
}: {
  depots: DepotListe[];
  maintenant: Date;
  fuseau: string;
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
            <li key={depot.id} className="border-b border-stone-100 last:border-b-0">
              <Link
                href={`${ROUTES.depots}/${depot.id}`}
                className="py-pas-3 -mx-pas-2 px-pas-2 block rounded-xs transition-colors hover:bg-stone-50"
              >
                <p className="text-petit line-clamp-2">
                  {depot.sourceType === "IMAGE" ? "Capture — " : null}
                  {depot.apercu || "Capture en cours de lecture"}
                </p>
                <p className="mt-pas-2 gap-pas-3 text-mono flex flex-wrap items-center text-stone-500">
                  <Avancement depot={depot} />
                  <span aria-hidden>·</span>
                  <span>{anciennete(depot.createdAt, maintenant, fuseau)}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
