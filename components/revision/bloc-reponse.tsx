"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

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
 * **Le bloc prend toute la colonne, son texte non**, et l'intitulé occupe ce qui
 * reste. Le texte garde une mesure bornée — une question est un titre et peut
 * s'étaler, une réponse est un paragraphe et n'a rien à gagner à faire onze
 * cents pixels de large. Ce qui manquait, c'était de donner un rôle à la place
 * ainsi libérée, au lieu de la laisser en creux à droite d'une arête.
 */
export function BlocReponse({
  intitule,
  children,
}: {
  /** Absent, le bloc s'intitule « La réponse ». */
  intitule?: string;
  children: ReactNode;
}) {
  const t = useTranslations("revision.question");

  return (
    <div className="rounded-carte bg-surface-roche grain grain-clair p-pas-6 md:p-pas-8 relative overflow-hidden">
      {/* Les jetons de code s'inversent ici, et seulement ici : de l'encre diluée
          sur la roche est plus sombre que la roche, donc invisible. */}
      {/* L'intitulé passe dans la marge dès qu'il y a de la place : c'est une
          glose, la forme d'une note portée à côté du texte qu'elle qualifie —
          celle des dictionnaires et des éditions annotées, qui est exactement ce
          qu'est ce bloc.

          Elle règle le vide sans y toucher. La scène fait onze cent cinquante
          pixels et le texte s'arrête à sept cent soixante-huit ; élargir le
          texte pour combler l'écart lui donnerait cent vingt-huit caractères par
          ligne, où l'œil ne retrouve plus la ligne suivante. La question, elle,
          peut s'étaler : elle est en gros caractères, et la même largeur y fait
          une mesure normale. Ce n'est donc pas la mesure du texte qui était
          fausse, c'est que la carte ne faisait rien de la place qui restait.

          Sous six cent quarante pixels, l'intitulé repasse au-dessus : une
          colonne de marge sur un téléphone mangerait la moitié de la ligne. */}
      <div className="[&_code]:bg-jeton-clair [&_code]:border-jeton-bord-clair gap-pas-3 sm:gap-pas-8 relative z-10 flex flex-col sm:grid sm:grid-cols-[8.5rem_1fr] sm:items-start">
        <p className="text-mono font-mono tracking-[0.12em] text-stone-400 uppercase sm:pt-[0.3em]">
          {intitule ?? t("laReponse")}
        </p>

        <div className="text-corps leading-relaxed whitespace-pre-wrap text-stone-50">
          {children}
        </div>
      </div>
    </div>
  );
}
