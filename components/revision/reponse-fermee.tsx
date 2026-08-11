"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Les formats dont la justesse est connue sans jugement humain : QCM et vrai
 * ou faux.
 *
 * Choisir arrête le chronomètre. Ce qui suit — lire la correction, continuer —
 * n'entre plus dans la mesure : une bonne réponse en deux secondes et une bonne
 * réponse en vingt-cinq secondes ne disent pas la même chose, et le temps de
 * lecture d'une correction ne dit rien du tout.
 */

/** Les touches servent d'étiquettes : ce ne sont pas des numéros décoratifs. */
const TOUCHES = ["1", "2", "3", "4", "5", "6"];

export function ReponseFermee({
  options,
  correctIndex,
  choisi,
  onChoisir,
}: {
  options: string[];
  correctIndex: number;
  choisi: number | null;
  onChoisir: (index: number) => void;
}) {
  const repondu = choisi !== null;

  useEffect(() => {
    if (repondu) return;

    function auClavier(evenement: KeyboardEvent) {
      const rang = TOUCHES.indexOf(evenement.key);

      if (rang >= 0 && rang < options.length) onChoisir(rang);
    }

    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [options.length, onChoisir, repondu]);

  return (
    <ul className="gap-pas-2 mt-pas-6 flex flex-col">
      {options.map((option, rang) => {
        const estBonne = rang === correctIndex;
        const estChoisie = rang === choisi;

        return (
          <li key={option}>
            <Button
              type="button"
              variant="outline"
              disabled={repondu}
              onClick={() => onChoisir(rang)}
              // La bonne réponse se montre toujours après coup, même quand elle
              // n'a pas été choisie : sans elle, l'échec n'apprend rien.
              className={[
                "gap-pas-3 h-auto w-full justify-start py-3 text-left font-normal whitespace-normal disabled:opacity-100",
                repondu && estBonne ? "border-lichen bg-lichen/10 text-stone-900" : "",
                repondu && estChoisie && !estBonne ? "border-alerte bg-alerte-surface" : "",
                repondu && !estBonne && !estChoisie ? "text-stone-500" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span aria-hidden className="text-mono font-mono text-stone-500">
                {TOUCHES[rang]}
              </span>
              <span className="text-corps">
                <TexteTechnique>{option}</TexteTechnique>
              </span>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
