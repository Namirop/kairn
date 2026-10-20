import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Les concepts d'un essai, sur une colonne : ils se lisent à la suite. Dalle en
 * `stone-700` : `stone-800` vaut la roche qui la porte (`surfaces.ts`).
 *
 * L'entrée est en CSS, jamais en `motion` : l'opacité à zéro posée en ligne
 * attend une image que `requestAnimationFrame`, gelé en arrière-plan, peut ne
 * jamais donner. Une animation CSS finit toujours sur l'état normal.
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
