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

/**
 * Ce qu'un lecteur d'écran entend d'une option, une fois le choix fait.
 *
 * À l'écran, la couleur suffit et l'écrit ferait doublon. Sans elle, il ne
 * resterait rien : le sort de chaque option se lit dans sa bordure et son fond.
 */
function marqueLue(estBonne: boolean, estChoisie: boolean): string {
  if (estBonne) return "Bonne réponse.";
  if (estChoisie) return "Ton choix, faux.";

  return "";
}

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
    <ul className="gap-pas-2 mt-pas-scene flex flex-col">
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
                // Une option n'est pas une pilule. Le galet est la forme d'un
                // geste — un bouton d'une ligne, dont la hauteur est la sienne.
                // Une option tient deux ou trois lignes de texte, et sa hauteur
                // lui vient de ce qu'elle contient : le même rayon y dessine
                // deux demi-cercles de vingt-cinq pixels qui mangent le premier
                // et le dernier mot. C'est la forme du champ qui convient — ce
                // qu'une option est, quelque chose qu'on désigne.
                "rounded-champ gap-pas-3 h-auto w-full justify-start py-3 text-left font-normal whitespace-normal disabled:opacity-100",
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
              {repondu ? <span className="sr-only">{marqueLue(estBonne, estChoisie)}</span> : null}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
