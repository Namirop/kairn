"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Etat = "attente" | "envoi" | "fait" | "echec";

export function FormulaireDesinscription({ jeton }: { jeton: string }) {
  const [etat, setEtat] = useState<Etat>("attente");

  // Un constat, et rien d'autre. Le filet d'accent qui le portait était une
  // citation dans une colonne alignée à gauche ; l'écran est maintenant une
  // halte centrée, où un trait à gauche d'une phrase centrée ne se rapporte à
  // rien. Ce qui reste est ce qu'on vient chercher : c'est fait.
  if (etat === "fait") {
    return (
      <p className="text-corps text-stone-900">
        C&apos;est fait. Tu ne recevras plus d&apos;email de Kairn.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <Button
        disabled={etat === "envoi"}
        onClick={() => {
          setEtat("envoi");
          void fetch(`/api/desinscription?jeton=${encodeURIComponent(jeton)}`, {
            method: "POST",
          }).then(
            (reponse) => setEtat(reponse.ok ? "fait" : "echec"),
            () => setEtat("echec"),
          );
        }}
      >
        {etat === "envoi" ? "En cours…" : "Confirmer"}
      </Button>

      {etat === "echec" ? (
        <p className="mt-pas-3 text-petit text-alerte max-w-sm text-pretty" role="alert">
          La désinscription n&apos;a pas abouti. Réessaie, ou coupe les rappels depuis tes réglages.
        </p>
      ) : null}
    </div>
  );
}
