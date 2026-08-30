"use client";

import { PhraseTrouee } from "@/components/revision/phrase-trouee";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * La question de l'échantillon, dans la carte de l'écran de révision.
 *
 * Même arrondi, même corps d'énoncé, même absence de bordure : ce qu'on montre
 * ici n'est pas une maquette de question, c'est la question telle qu'elle
 * apparaîtra — et la reconnaître plus tard fait partie de ce qu'on promet.
 *
 * Le trou d'un texte à trou est donc **le composant de l'écran de révision**, et
 * pas trois traits de soulignement. Les trois traits étaient le marqueur brut de
 * la génération arrivé jusqu'à l'écran sans être lu par personne — le même défaut
 * que les accents graves autour d'un terme de code, corrigé au même endroit. La
 * carte d'ici est d'ombre là où celle de la révision est de papier : le creux
 * prend le cran de contraste qu'il faut pour ne pas se fondre dedans.
 */
export function CarteDeLEchantillon({
  question,
  options,
}: {
  question: string;
  /** Les propositions d'un QCM. Les autres formats n'en ont pas. */
  options: string[] | null;
}) {
  return (
    <div className="rounded-carte bg-surface-ombre p-pas-dedans" aria-live="polite">
      <p className="text-enonce leading-tight font-bold text-pretty break-words text-stone-900">
        <PhraseTrouee phrase={question} comble={null} surOmbre />
      </p>

      {/* Les propositions, sous l'énoncé et côte à côte.

          Elles ne sont pas rendues comme celles de l'écran de révision — une
          colonne de boutons pleine largeur — parce qu'ici on ne répond pas :
          ce seraient des boutons qui ne font rien, et une colonne de quatre
          doublerait la hauteur de la vitrine. Sans fond ni bordure et sur une
          ligne, elles disent ce qu'elles sont — le choix qu'on aura — sans se
          donner pour cliquables.

          La bonne n'est pas marquée, et elle n'est même pas descendue jusqu'ici :
          voir `optionsDUnQCM`. */}
      {options ? (
        <ul className="gap-x-pas-4 gap-y-pas-1 mt-pas-4 text-petit flex flex-wrap text-stone-500">
          {options.map((option) => (
            <li key={option} className="before:mr-pas-2 before:text-stone-300 before:content-['—']">
              <TexteTechnique>{option}</TexteTechnique>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
