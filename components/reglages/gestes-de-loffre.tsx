"use client";

import { useActionState } from "react";
import {
  type EtatDuPaiement,
  payerAction,
  portailAction,
  renouvellementAction,
} from "@/app/(app)/reglages/paiement";
import { Button } from "@/components/ui/button";
import { PRIX_ANNUEL, PRIX_MENSUEL } from "@/lib/domain/prix";

/**
 * Les boutons qui engagent de l'argent, et ce qu'ils disent quand ils échouent.
 *
 * À part du panneau qui les héberge, et pas seulement pour tenir une longueur :
 * ce sont les seuls éléments de tout le produit qui ouvrent une page de
 * paiement, résilient un abonnement ou envoient chez Stripe. Les garder dans un
 * fichier qui ne fait que ça rend visible, à la relecture comme à la revue, tout
 * ajout d'un geste d'argent.
 */

/**
 * Les deux cadences. Deux boutons, pas deux colonnes : le choix est fait, il
 * reste à payer.
 *
 * Le refus d'un paiement fermé appartient à l'écran qui héberge ces boutons, pas
 * à eux : c'est lui qui sait ce qu'il y a à dire à la place, et il n'a alors
 * aucune raison de charger un composant qui ne fait qu'engager de l'argent.
 */
export function Achat({ ouvert }: { ouvert: boolean }) {
  const [etat, action, enCours] = useActionState<EtatDuPaiement, FormData>(payerAction, {});

  if (!ouvert) return null;

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

      <p className="mt-pas-3 text-petit text-stone-500">
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

/**
 * Le seul lien qui sorte du produit.
 *
 * Discret et non un bouton : ce n'est pas ce qu'on vient faire sur cet écran.
 * Quelqu'un l'ouvre parce que sa carte a expiré ou qu'il lui faut une facture —
 * deux fois par an, et il sait déjà ce qu'il cherche.
 *
 * Le libellé nomme les deux choses qu'on y trouve, parce que c'est tout ce qu'on
 * y trouve : la configuration du portail refuse le reste.
 */
export function Portail() {
  const [etat, action, enCours] = useActionState<EtatDuPaiement, FormData>(portailAction, {});

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={enCours}
        className="rounded-galet text-petit text-stone-500 underline-offset-4 transition-colors hover:text-stone-900 hover:underline focus-visible:underline disabled:opacity-60"
      >
        Factures et moyen de paiement
      </button>

      <Message erreur={etat.erreur} />
    </form>
  );
}

/**
 * Le message n'occupe plus rien tant qu'il n'a rien à dire.
 *
 * Sa place était réservée en permanence — une ligne sous chaque geste, pour une
 * phrase qui paraît un jour sur cent. Trois gestes dans la même carte, et c'était
 * soixante pixels de vide qui écartaient « arrêter le renouvellement » du lien
 * vers les factures au point qu'ils n'avaient plus l'air d'appartenir au même
 * sujet. Il est **sous** son bouton : il ne décale que ce qui vient après, à
 * l'instant où quelqu'un lit une erreur, et ce déplacement-là se comprend.
 */
function Message({ erreur }: { erreur?: string }) {
  return (
    <p className="mt-pas-2 text-petit empty:mt-0" role="status" aria-live="polite">
      {erreur ? <span className="text-alerte">{erreur}</span> : null}
    </p>
  );
}
