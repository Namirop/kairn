"use client";

import type { ReactNode } from "react";

/**
 * La réponse de référence, sur sa propre matière.
 *
 * Elle était posée derrière un filet vertical, comme une citation dans un
 * article : le filet ne dit rien, il ne fait qu'occuper la marge, et ce qu'il
 * accompagne ne ressort pas — or c'est le seul moment de l'écran où l'on vient
 * chercher un texte à lire.
 *
 * Elle prend donc la roche, la même que le rail : la matière qui, dans ce
 * produit, porte ce qui est établi. La carte de la question est claire et
 * demande ; ce bloc est sombre et répond. Aucun élément nouveau n'entre dans le
 * système — c'est la surface qui change de rôle.
 *
 * **Ce n'est pas lui qui vient à l'écran, c'est ce qui le contient.** Il l'a
 * fait un temps, et il n'amenait alors que lui : le bouton qui le suit restait
 * dessous, derrière la barre du bas d'un téléphone. Le déplacement appartient
 * donc à `SuiteDeLaQuestion`, qui porte le bloc **et** le geste qui vient
 * après.
 *
 * **Le bloc prend toute la colonne, son texte non.** Arrêté aux deux tiers, il
 * s'alignait sur rien : ni sur la carte de la question au-dessus, ni sur la
 * rangée d'actions en dessous, et cette arête au milieu du vide se remarquait
 * avant qu'on ait lu la réponse. Le texte, lui, garde une mesure longue mais
 * bornée — une question est un titre et peut s'étaler, une réponse est un
 * paragraphe et n'a rien à gagner à faire onze cents pixels de large.
 */
export function BlocReponse({
  intitule = "La réponse",
  children,
}: {
  intitule?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-carte bg-surface-roche grain grain-clair p-pas-6 md:p-pas-8 relative overflow-hidden">
      {/* Les jetons de code s'inversent ici, et seulement ici : de l'encre diluée
          sur la roche est plus sombre que la roche, donc invisible. */}
      <div className="[&_code]:bg-jeton-clair [&_code]:border-jeton-bord-clair relative z-10">
        <p className="text-mono font-mono tracking-[0.12em] text-stone-400 uppercase">{intitule}</p>

        <div className="mt-pas-3 text-corps max-w-3xl leading-relaxed whitespace-pre-wrap text-stone-50">
          {children}
        </div>
      </div>
    </div>
  );
}
