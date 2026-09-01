"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  type EtatDuPaiement,
  payerAction,
  renouvellementAction,
} from "@/app/(app)/reglages/paiement";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { PRIX_ANNUEL, PRIX_MENSUEL } from "@/lib/domain/prix";

/**
 * Les boutons qui engagent de l'argent, et ce qu'ils disent quand ils échouent.
 *
 * À part du panneau qui les héberge, et pas seulement pour tenir une longueur :
 * ce sont les seuls éléments de tout le produit qui ouvrent une page de
 * paiement ou résilient un abonnement. Les garder dans un fichier qui ne fait
 * que ça rend visible, à la relecture comme à la revue, tout ajout d'un
 * troisième geste d'argent.
 */

/** Les deux cadences. Deux boutons, pas deux colonnes : le choix est fait, il reste à payer. */
export function Achat({ ouvert }: { ouvert: boolean }) {
  const [etat, action, enCours] = useActionState<EtatDuPaiement, FormData>(payerAction, {});

  if (!ouvert) {
    return (
      <Link
        href={ROUTES.tarifs}
        className="rounded-galet text-petit text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
      >
        Voir les tarifs
      </Link>
    );
  }

  return (
    <>
      <div className="gap-pas-3 flex flex-wrap">
        <Cadence action={action} cadence="month" enCours={enCours} variante="default">
          Payer {PRIX_MENSUEL} € par mois
        </Cadence>
        <Cadence action={action} cadence="year" enCours={enCours} variante="outline">
          Payer {PRIX_ANNUEL} € par an
        </Cadence>
      </div>

      <p className="mt-pas-2 text-petit text-stone-500">
        L&apos;année revient à dix mois payés pour douze. La carte se saisit chez Stripe.
      </p>

      <Message erreur={etat.erreur} />
    </>
  );
}

function Cadence({
  action,
  cadence,
  enCours,
  variante,
  children,
}: {
  action: (donnees: FormData) => void;
  cadence: "month" | "year";
  enCours: boolean;
  variante: "default" | "outline";
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="cadence" value={cadence} />
      <Button type="submit" variant={variante} size="sm" disabled={enCours}>
        {children}
      </Button>
    </form>
  );
}

/** Arrêter, ou revenir sur son arrêt. Jamais les deux : l'un est l'inverse de l'autre. */
export function Renouvellement({ resilieALaFin }: { resilieALaFin: boolean }) {
  const [etat, action, enCours] = useActionState<EtatDuPaiement, FormData>(
    renouvellementAction,
    {},
  );

  return (
    <form action={action}>
      <input type="hidden" name="geste" value={resilieALaFin ? "reprendre" : "arreter"} />

      {/* Arrêter n'est pas destructeur — rien ne se supprime et la reprise est
          à un clic. Le rouge irait à contre-emploi ici : il annoncerait une
          conséquence que ce bouton n'a pas. */}
      <Button
        type="submit"
        variant={resilieALaFin ? "default" : "outline"}
        size="sm"
        disabled={enCours}
      >
        {resilieALaFin ? "Reprendre l'abonnement" : "Arrêter le renouvellement"}
      </Button>

      <Message erreur={etat.erreur} />
    </form>
  );
}

/** L'emplacement du message est réservé : une erreur ne décale pas les boutons. */
function Message({ erreur }: { erreur?: string }) {
  return (
    <p className="mt-pas-2 text-petit min-h-5" role="status" aria-live="polite">
      {erreur ? <span className="text-alerte">{erreur}</span> : null}
    </p>
  );
}
