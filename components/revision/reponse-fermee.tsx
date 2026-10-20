"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * QCM et vrai ou faux. Choisir arrête le chronomètre : le temps de lecture de la
 * correction ne dit rien de la mémoire.
 */

/** Les touches servent d'étiquettes : ce ne sont pas des numéros décoratifs. */
const TOUCHES = ["1", "2", "3", "4", "5", "6"];

/** Pour le lecteur d'écran : à l'écran, le sort d'une option ne se lit qu'à sa bordure et son fond. */
function marqueLue(estBonne: boolean, estChoisie: boolean): "bonneOption" | "choixFaux" | null {
  if (estBonne) return "bonneOption";
  if (estChoisie) return "choixFaux";

  return null;
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
  const t = useTranslations("revision.question.verdict");

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
        const marque = marqueLue(estBonne, estChoisie);

        return (
          <li key={option}>
            <Button
              type="button"
              variant="outline"
              disabled={repondu}
              onClick={() => onChoisir(rang)}
              // La bonne réponse se montre même non choisie : sans elle, l'échec n'apprend rien.
              className={[
                // La pierre, pas la pilule : sur plusieurs lignes, son rayon
                // mangerait le premier et le dernier mot.
                "rounded-pierre gap-pas-3 py-pas-3 h-auto w-full justify-start text-left font-normal whitespace-normal disabled:opacity-100",
                // Le papier, sinon l'option se fond dans le sol de la session ;
                // après réponse, les options hors jeu y redescendent. Un seul
                // `bg-*` par état : deux laisseraient l'ordre de la feuille décider.
                !repondu ? "bg-surface-papier" : "",
                repondu && estBonne ? "border-lichen-deep bg-surface-papier text-stone-900" : "",
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
              {repondu ? <span className="sr-only">{marque ? t(marque) : ""}</span> : null}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
