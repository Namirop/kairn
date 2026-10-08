"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Une suppression qui demande confirmation sur place.
 *
 * Sur place plutôt que dans une fenêtre : la modale arrache le regard de ce
 * qu'on est en train de supprimer, et il faut justement le regarder une
 * deuxième fois. Le geste reste où il a été demandé, et l'objet visé reste à
 * l'écran pendant qu'on répond.
 *
 * Le premier bouton est discret, le second porte l'alerte et **dit ce qui
 * part** : « Supprimer » deux fois de suite ne demande rien, ça fait cliquer
 * deux fois. Ce que la seconde étape ajoute, c'est l'inventaire de ce qu'on
 * emporte — et il n'est pas le même pour un dépôt que pour un concept.
 *
 * Le composant existe parce que le dépôt avait cette confirmation et pas le
 * concept, alors que le concept emporte lui aussi des questions écrites et des
 * passages faits. Deux gestes également irréversibles ne se demandent pas de
 * deux façons — et surtout pas l'un sans rien demander du tout.
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

      {/* La conséquence n'apparaît qu'une fois la question posée. Affichée en
          permanence, elle deviendrait le décor de l'écran et personne ne la
          lirait le jour où elle compte.

          Elle court sur toute la largeur de sa carte. Elle était serrée à une
          mesure de lecture, ce qui se défend pour un paragraphe et se retourne
          contre une phrase : dans une carte deux fois plus large, la ligne
          s'arrêtait au milieu et repartait à la ligne sans qu'aucun bord ne
          l'explique — l'œil lit ça comme un défaut d'affichage, pas comme un
          confort de lecture. Le texte au-dessus, celui du concept, occupe déjà
          toute la carte : c'est lui qui donne la mesure de ce bloc. */}
      {confirme ? <p className="mt-pas-3 text-petit text-stone-500">{consequence}</p> : null}
    </div>
  );
}
