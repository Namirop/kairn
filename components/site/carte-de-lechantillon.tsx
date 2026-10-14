"use client";

import { PhraseTrouee } from "@/components/revision/phrase-trouee";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * La question de l'échantillon, dans la carte de l'écran de révision.
 *
 * Même arrondi et même corps d'énoncé que la carte de révision, et le même
 * `PhraseTrouee` : c'est la question telle qu'elle apparaîtra. La carte est de
 * roche, la fenêtre de l'essai étant sombre ; le trou suit (voir `FondDuTrou`).
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
    <div
      className="rounded-carte p-pas-dedans [&_code]:bg-jeton-clair [&_code]:border-jeton-bord-clair bg-stone-700"
      aria-live="polite"
    >
      <p className="text-enonce leading-tight font-bold text-pretty break-words text-stone-50">
        <PhraseTrouee phrase={question} comble={null} fond="roche" />
      </p>

      {/* Les propositions, en texte et non en boutons : ici on ne répond pas.
          Une par ligne sur téléphone : une proposition de QCM n'a pas de
          longueur maximale, et deux côte à côte déborderaient de la carte. La
          bonne n'arrive pas jusqu'ici : voir `optionsDUnQCM`. */}
      {options ? (
        <ul className="gap-x-pas-4 gap-y-pas-1 mt-pas-4 text-petit grid grid-cols-1 text-stone-300 md:flex md:flex-wrap">
          {options.map((option) => (
            <li key={option} className="before:mr-pas-2 before:text-stone-500 before:content-['—']">
              <TexteTechnique>{option}</TexteTechnique>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
