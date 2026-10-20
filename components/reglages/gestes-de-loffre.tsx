"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  type EtatDuPaiement,
  payerAction,
  portailAction,
  renouvellementAction,
} from "@/app/(app)/reglages/paiement";
import { Button } from "@/components/ui/button";
import { PRIX_ANNUEL, PRIX_MENSUEL } from "@/lib/domain/prix";

/** Les seuls gestes qui engagent de l'argent : isolés ici, tout ajout se voit en revue. */

/** Paiement fermé : l'écran hôte dit quoi afficher à la place. */
export function Achat({ ouvert }: { ouvert: boolean }) {
  const [etat, action, enCours] = useActionState<EtatDuPaiement, FormData>(payerAction, {});
  const t = useTranslations("compte.offre.achat");

  if (!ouvert) return null;

  return (
    <>
      <div className="gap-pas-3 flex flex-wrap">
        <Cadence action={action} cadence="month" enCours={enCours} variante="default">
          {t("mensuel", { prix: PRIX_MENSUEL })}
        </Cadence>
        <Cadence action={action} cadence="year" enCours={enCours} variante="outline">
          {t("annuel", { prix: PRIX_ANNUEL })}
        </Cadence>
      </div>

      <p className="mt-pas-3 text-petit text-stone-500">{t("note")}</p>

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

/** Arrêter, ou revenir sur son arrêt : jamais les deux. */
export function Renouvellement({ resilieALaFin }: { resilieALaFin: boolean }) {
  const [etat, action, enCours] = useActionState<EtatDuPaiement, FormData>(
    renouvellementAction,
    {},
  );
  const t = useTranslations("compte.offre");

  return (
    <form action={action}>
      <input type="hidden" name="geste" value={resilieALaFin ? "reprendre" : "arreter"} />

      {/* Pas de rouge : arrêter ne supprime rien, la reprise est à un clic. */}
      <Button
        type="submit"
        variant={resilieALaFin ? "default" : "outline"}
        size="sm"
        disabled={enCours}
      >
        {resilieALaFin ? t("reprendre") : t("arreter")}
      </Button>

      <Message erreur={etat.erreur} />
    </form>
  );
}

/**
 * Discret : on y vient rarement, en sachant quoi chercher. Le libellé nomme les
 * deux seules choses que la configuration du portail autorise.
 */
export function Portail() {
  const [etat, action, enCours] = useActionState<EtatDuPaiement, FormData>(portailAction, {});
  const t = useTranslations("compte.offre");

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={enCours}
        className="rounded-galet text-petit text-stone-500 underline-offset-4 transition-colors hover:text-stone-900 hover:underline focus-visible:underline disabled:opacity-60"
      >
        {t("portail")}
      </button>

      <Message erreur={etat.erreur} />
    </form>
  );
}

/** Sans place réservée tant qu'il est vide : sous les trois gestes, elle écarterait la carte. */
function Message({ erreur }: { erreur?: string }) {
  return (
    <p className="mt-pas-2 text-petit empty:mt-0" role="status" aria-live="polite">
      {erreur ? <span className="text-alerte">{erreur}</span> : null}
    </p>
  );
}
