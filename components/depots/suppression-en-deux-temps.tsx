"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Une suppression qui demande confirmation sur place, pas dans une modale :
 * l'objet visé doit rester sous les yeux pendant qu'on répond. Le second
 * bouton dit ce qui part — « Supprimer » deux fois ne demande rien, ça fait
 * cliquer deux fois. Partagé par le dépôt et le concept, deux gestes également
 * irréversibles.
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
  /** Ce que le formulaire porte, en champs cachés. */
  champs: Record<string, string>;
  /** Le libellé au repos. Il nomme l'objet : « Supprimer ce dépôt ». */
  declencheur: string;
  /** Le libellé qui engage. Il nomme ce qui part avec. */
  confirmation: string;
  /** La phrase qui détaille l'irréversible, montrée pendant la confirmation. */
  consequence: string;
  taille?: "sm" | "default";
  /** Les autres gestes de la même rangée, posés avant celui-ci. */
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

      {/* La conséquence n'apparaît qu'une fois la question posée : affichée en
          permanence, elle deviendrait du décor. Pleine largeur de sa carte,
          comme le texte du concept au-dessus. */}
      {confirme ? <p className="mt-pas-3 text-petit text-stone-500">{consequence}</p> : null}
    </div>
  );
}
