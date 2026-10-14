import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Les concepts d'un essai, chacun sur sa dalle, sur une colonne : ils se lisent
 * à la suite, ils ne se comparent pas.
 *
 * La dalle est en `stone-700` et non en `stone-800`, qui vaut exactement la
 * roche qui la porte : elle y serait invisible. Voir `surfaces.ts`.
 *
 * Elles arrivent l'une après l'autre, à 70 ms d'écart, comme sorties du texte.
 *
 * L'entrée est en CSS, jamais en `motion` : une animation JavaScript pose
 * l'opacité à zéro en ligne et attend une image suivante pour la remonter. Si
 * elle ne vient pas (onglet en arrière-plan, `requestAnimationFrame` gelé), le
 * seul contenu qui convertisse reste invisible. Une animation CSS finit
 * toujours sur l'état normal de l'élément.
 */

type Concept = { id: string; concept: string; tags: string[] };

/** Assez pour qu'on voie les dalles se poser, trop peu pour qu'on attende. */
const ECART_MS = 70;

export function PileDeConcepts({ concepts }: { concepts: Concept[] }) {
  return (
    <ul className="gap-pas-3 flex flex-col">
      {concepts.map((concept, rang) => (
        <li
          key={concept.id}
          className="rounded-carte p-pas-dedans [&_code]:bg-jeton-clair [&_code]:border-jeton-bord-clair motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards bg-stone-700"
          style={{ animationDelay: `${rang * ECART_MS}ms` }}
        >
          <p className="text-h2-app leading-relaxed text-stone-50">
            <TexteTechnique>{concept.concept}</TexteTechnique>
          </p>
        </li>
      ))}
    </ul>
  );
}
