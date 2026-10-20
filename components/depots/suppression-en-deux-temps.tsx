"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Confirmation sur place, pas en modale : l'objet visé reste sous les yeux. Le
 * second bouton dit ce qui part : « Supprimer » deux fois fait juste cliquer
 * deux fois.
 */
export function SuppressionEnDeuxTemps({
  action,
  champs,
  declencheur,
  confirmation,
  consequence,
  taille = "default",
  avant,
}: {
  action: (donnees: FormData) => void | Promise<void>;
  /** En champs cachés. */
  champs: Record<string, string>;
  /** Nomme l'objet : « Supprimer ce dépôt ». */
  declencheur: string;
  /** Nomme ce qui part avec. */
  confirmation: string;
  consequence: string;
  taille?: "sm" | "default";
  /** Les autres gestes de la rangée. */
  avant?: ReactNode;
}) {
  const t = useTranslations("depots.concept");
  const [confirme, setConfirme] = useState(false);

  return (
    <div>
      <div className="gap-pas-2 flex flex-wrap">
        {avant}

        {confirme ? (
          <>
            <form action={action}>
              {Object.entries(champs).map(([nom, valeur]) => (
                <input key={nom} type="hidden" name={nom} value={valeur} />
              ))}
              <Button type="submit" size={taille} variant="destructive">
                {confirmation}
              </Button>
            </form>
            <Button type="button" size={taille} variant="ghost" onClick={() => setConfirme(false)}>
              {t("annuler")}
            </Button>
          </>
        ) : (
          <Button type="button" size={taille} variant="ghost" onClick={() => setConfirme(true)}>
            {declencheur}
          </Button>
        )}
      </div>

      {/* Seulement la question posée : permanente, elle deviendrait du décor. */}
      {confirme ? <p className="mt-pas-3 text-petit text-stone-500">{consequence}</p> : null}
    </div>
  );
}
