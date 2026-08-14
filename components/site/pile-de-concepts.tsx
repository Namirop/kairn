"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Les concepts d'un essai, bornés à trois de hauteur.
 *
 * Un découpage rend un à huit concepts, et huit poussaient le bouton « Les
 * garder » sous la ligne de flottaison : la page la plus importante du produit
 * cachait son action au moment exact où elle venait de convaincre. La hauteur
 * est donc fixe quel que soit le nombre, et le reste défile.
 *
 * **Trois, mesurés plutôt que devinés.** Un concept fait deux à quatre lignes ;
 * une hauteur en `rem` aurait coupé le troisième au milieu chez l'un et laissé
 * un blanc chez l'autre. On lit la position réelle du troisième après rendu, et
 * une borne en CSS tient l'intervalle d'avant la mesure — sans elle, la liste
 * s'affiche entière une image avant de se replier, et ça se voit.
 *
 * L'ascenseur est retiré parce qu'une barre système sur du papier minéral est
 * le seul objet de la page qui vienne d'ailleurs. Ce qu'il disait est repris par
 * un chevron sous la liste, et la zone devient focalisable pour que le clavier
 * garde ce que la souris a : c'est la contrepartie non négociable du retrait.
 */

const VISIBLES = 3;

/**
 * Ce qu'on tolère avant de dire « on est en bas ».
 *
 * Les hauteurs fractionnaires d'un zoom navigateur laissent un demi-pixel de
 * défilement résiduel : à l'égalité stricte, le chevron ne s'éteignait jamais.
 */
const MARGE_DE_FIN = 4;

type Concept = { id: string; concept: string; tags: string[] };

export function PileDeConcepts({ concepts }: { concepts: Concept[] }) {
  const liste = useRef<HTMLUListElement>(null);
  const [hauteur, setHauteur] = useState<number | null>(null);
  const [reste, setReste] = useState(false);

  const deborde = concepts.length > VISIBLES;

  const suivreLeDefilement = useCallback(() => {
    const zone = liste.current;

    if (!zone) return;

    setReste(zone.scrollTop + zone.clientHeight < zone.scrollHeight - MARGE_DE_FIN);
  }, []);

  useEffect(() => {
    const zone = liste.current;

    if (!zone || !deborde) {
      setHauteur(null);
      setReste(false);

      return;
    }

    // La mesure se refait à chaque changement de largeur : le texte se recompose,
    // et trois concepts sur mobile ne font pas la hauteur de trois sur desktop.
    const mesurer = () => {
      const elements = Array.from(zone.children).filter(
        (element): element is HTMLElement => element instanceof HTMLElement,
      );
      const premier = elements[0];
      const troisieme = elements[VISIBLES - 1];

      if (!premier || !troisieme) return;

      setHauteur(troisieme.offsetTop + troisieme.offsetHeight - premier.offsetTop);
      suivreLeDefilement();
    };

    mesurer();

    const observateur = new ResizeObserver(mesurer);

    observateur.observe(zone);

    return () => observateur.disconnect();
  }, [concepts, deborde, suivreLeDefilement]);

  // La hauteur mesurée n'est posée qu'au rendu suivant : relire le défilement
  // une fois qu'elle s'applique, sinon le chevron répond encore de la borne CSS.
  useEffect(() => {
    suivreLeDefilement();
  }, [hauteur, suivreLeDefilement]);

  return (
    <div className="gap-pas-2 flex flex-col">
      <ul
        ref={liste}
        onScroll={suivreLeDefilement}
        tabIndex={deborde ? 0 : undefined}
        aria-label={deborde ? "Concepts trouvés — la liste défile" : undefined}
        style={hauteur === null ? undefined : { maxHeight: `${hauteur}px` }}
        className={`gap-pas-3 flex flex-col ${
          deborde ? "sans-ascenseur max-h-[22rem] overflow-y-auto" : ""
        }`}
      >
        {concepts.map((concept) => (
          <li key={concept.id} className="border-lichen pl-pas-4 border-l-2">
            <p className="text-corps leading-relaxed text-stone-900">
              <TexteTechnique>{concept.concept}</TexteTechnique>
            </p>
          </li>
        ))}
      </ul>

      {/* Ce qui remplace la barre. Sous la liste et non par-dessus : un fondu
          posé sur la coupe éteignait les deux dernières lignes du troisième
          concept, c'est-à-dire précisément ce qu'on garde visible. Le chevron
          est donc seul, dans sa propre ligne.

          Sa place est réservée même éteint — il s'allume et s'éteint au fil du
          défilement, et un bouton qui se décale quand on arrive en bas est pire
          que pas d'indicateur du tout. */}
      {deborde ? (
        <div
          aria-hidden
          className={`flex justify-center transition-opacity duration-200 ${
            reste ? "opacity-100" : "opacity-0"
          }`}
        >
          <ChevronVersLeBas />
        </div>
      ) : null}
    </div>
  );
}

function ChevronVersLeBas() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-stone-500"
    >
      <path d="M4.5 7 9 11.5 13.5 7" />
    </svg>
  );
}
