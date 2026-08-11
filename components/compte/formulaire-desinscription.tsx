"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Etat = "attente" | "envoi" | "fait" | "echec";

export function FormulaireDesinscription({ jeton }: { jeton: string }) {
  const [etat, setEtat] = useState<Etat>("attente");

  if (etat === "fait") {
    return (
      <p className="border-lichen pl-pas-4 border-l-2 text-stone-900">
        C&apos;est fait. Tu ne recevras plus d&apos;email de Kairn.
      </p>
    );
  }

  return (
    <div>
      <Button
        size="lg"
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
        <p className="mt-pas-3 text-petit text-alerte" role="alert">
          La désinscription n&apos;a pas abouti. Réessaie, ou coupe les rappels depuis tes réglages.
        </p>
      ) : null}
    </div>
  );
}
