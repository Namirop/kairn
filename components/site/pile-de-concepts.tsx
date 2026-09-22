"use client";

import { motion, useReducedMotion } from "motion/react";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Les concepts d'un essai, posés un par un.
 *
 * **Ce n'étaient pas des objets, c'étaient des paragraphes.** Deux colonnes de
 * corps de texte, chacune sous un filet d'un pixel, au même corps que la légende
 * d'à côté et sur le même fond que la page. La seule preuve que le produit ait à
 * offrir se lisait comme le troisième paragraphe d'un article — et à trois
 * concepts, qui est la médiane, la grille se remplissait en dents de scie : deux
 * à gauche, un à droite, la moitié droite vide.
 *
 * Chacun a donc **sa propre dalle**, sur une colonne. Une surface, pas un filet :
 * c'est le seul outil que le système donne pour qu'un objet se détache, et c'est
 * ce qui les fait compter du regard sans les lire. Une colonne parce qu'ils ne
 * se comparent pas entre eux — on les lit à la suite, comme on remonte un
 * sentier.
 *
 * La dalle est en `stone-700` et non en `stone-800` : ce dernier vaut exactement
 * la roche qui la porte, et la dalle aurait été invisible sur son propre fond.
 * Voir `surfaces.ts`, où le défaut vivait depuis le début sans que personne
 * n'ait encore posé d'objet sur un panneau sombre. L'écart mesuré est de 1,34
 * contre 1,14 entre le papier et l'ombre.
 *
 * **Elles arrivent l'une après l'autre, et c'est la révélation.** Le décalage est
 * court — soixante-dix millisecondes — et il ne retarde rien : il dit que ces
 * blocs sont sortis d'un texte, un par un, au lieu d'apparaître tous ensemble
 * comme une page qui finit de charger. C'est le geste du produit, une pierre
 * puis une autre, et c'est le seul endroit public où il porte du vrai contenu.
 *
 * Les squelettes qui annonçaient leur forme sont partis avec la grille. Ils
 * existaient pour qu'aucun texte ne saute au moment du remplacement, ce qui est
 * la bonne règle dans une page ; dans une fenêtre, le changement de hauteur
 * **est** la révélation, et l'amortir revenait à la cacher.
 */

type Concept = { id: string; concept: string; tags: string[] };

/** Assez pour qu'on voie les dalles se poser, trop peu pour qu'on attende. */
const ECART_S = 0.07;

export function PileDeConcepts({ concepts }: { concepts: Concept[] }) {
  const immobile = useReducedMotion() ?? false;

  return (
    <ul className="gap-pas-3 flex flex-col">
      {concepts.map((concept, rang) => (
        <motion.li
          key={concept.id}
          className="rounded-carte p-pas-dedans [&_code]:bg-jeton-clair [&_code]:border-jeton-bord-clair bg-stone-700"
          initial={immobile ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            immobile
              ? undefined
              : { duration: 0.45, delay: rang * ECART_S, ease: [0.2, 0.8, 0.2, 1] }
          }
        >
          <p className="text-h2-app leading-relaxed text-stone-50">
            <TexteTechnique>{concept.concept}</TexteTechnique>
          </p>
        </motion.li>
      ))}
    </ul>
  );
}
