"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Etat = "attente" | "envoi" | "fait" | "echec";

export function FormulaireDesinscription({ jeton }: { jeton: string }) {
  const [etat, setEtat] = useState<Etat>("attente");
  const t = useTranslations("compte.connexion.desinscription");

  if (etat === "fait") {
    return <p className="text-corps text-stone-900">{t("fait")}</p>;
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
        {etat === "envoi" ? t("enCours") : t("confirmer")}
      </Button>

      {etat === "echec" ? (
        <p className="mt-pas-3 text-petit text-alerte max-w-sm text-pretty" role="alert">
          {t("echec")}
        </p>
      ) : null}
    </div>
  );
}
