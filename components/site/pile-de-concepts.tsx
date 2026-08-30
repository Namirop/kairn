import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Les concepts d'un essai, tous à l'écran.
 *
 * **La liste défilait, et elle n'a plus à le faire.** Elle vivait dans la
 * colonne de droite d'un formulaire, large de trente-six rem : à huit concepts,
 * le bouton « Les garder » passait sous la ligne de flottaison, donc on avait
 * borné la hauteur à trois et mis le reste derrière un chevron. Le prix était
 * lourd — la seule preuve que le produit ait à offrir, coupée en plein milieu
 * d'une phrase, avec un tiers d'elle-même visible — et il était payé pour
 * corriger une largeur, pas un contenu.
 *
 * Le résultat occupe maintenant toute la mesure du panneau, sur deux colonnes.
 * Huit concepts y tiennent en quatre rangs sans rien cacher, et cent trente
 * lignes de mesure de hauteur, d'observateur de redimensionnement et de chevron
 * de fin de course sont parties avec le problème qu'elles réglaient.
 *
 * Le filet de lichen à gauche fait le reste : c'est lui qui dit « un concept »,
 * et il se répète assez pour qu'on compte sans lire.
 *
 * **Chaque concept fait sa hauteur, pas celle de son rang.** Une grille étire
 * ses cellules par défaut : le filet d'un concept de deux lignes descendait
 * jusqu'au bas de celui de quatre lignes posé en face, et les trois lignes
 * blanches sous le texte se lisaient comme du texte manquant. Le filet mesure ce
 * qu'il borde, sinon il ne borde plus rien.
 */

type Concept = { id: string; concept: string; tags: string[] };

export function PileDeConcepts({ concepts }: { concepts: Concept[] }) {
  return (
    <ul className="gap-pas-4 md:gap-x-pas-8 md:gap-y-pas-6 grid items-start md:grid-cols-2">
      {concepts.map((concept) => (
        <li key={concept.id} className="border-lichen pl-pas-4 border-l-2">
          <p className="text-corps leading-relaxed text-stone-900">
            <TexteTechnique>{concept.concept}</TexteTechnique>
          </p>
        </li>
      ))}
    </ul>
  );
}
