"use client";

import { useState } from "react";
import { annulerMaitriseAction } from "@/app/(app)/depots/actions";
import { Button } from "@/components/ui/button";

/**
 * Le rattrapage d'un « je maîtrise ça ».
 *
 * Le mauvais clic le plus probable est celui qu'on vient de faire. Sans cette
 * bande, il faudrait deviner qu'on peut le défaire, et deviner où — personne ne
 * devinerait, et le geste vaudrait perte du concept pour trois mois.
 *
 * Elle disparaît dès que la question suivante est engagée : ce qui traîne
 * indéfiniment sur un écran cesse d'être lu.
 *
 * **C'est un objet posé, pas un en-tête de plus.** Elle vivait à plat sur la
 * surface, pleine largeur, sous une étiquette à chasse fixe en capitales — soit
 * exactement la forme de l'en-tête de scène qui la précède de deux lignes. On
 * lisait donc deux titres l'un sous l'autre, et le seul geste de la bande, son
 * annulation, partait se coller au bord droit de l'écran, à quinze cents pixels
 * du mot qu'il annule. Elle prend la seule forme que cette interface donne à ce
 * qui compte : du papier posé sur l'ombre.
 *
 * **Elle a la largeur de la carte de question, et rien de sa présence.** C'est
 * la colonne qui donne le rythme de l'écran : une bande plus étroite que tout
 * ce qui l'entoure aurait ajouté un second bord vertical à suivre. Elle
 * s'aligne donc, et se retire autrement — un rayon de champ plutôt que de
 * carte, deux lignes de haut, tout le texte au petit corps. Ce qui la fait voir
 * n'est pas sa force, c'est qu'elle est là où rien n'était.
 *
 * **L'état et son échéance tiennent sur une ligne**, et l'annulation juste
 * après. L'un ne va pas sans l'autre — sortir du cycle, c'est revenir dans
 * trois mois —, et les séparer en deux lignes de même gris revenait à empiler
 * trois informations sans en désigner aucune. Le poids fait la hiérarchie à
 * l'intérieur de la phrase, et le geste reste à portée du mot qu'il défait.
 */
export function SortiDuCycle({
  concept,
  onAnnule,
}: {
  concept: { atomId: string; concept: string };
  onAnnule: () => void;
}) {
  const [enCours, setEnCours] = useState(false);

  async function annuler() {
    setEnCours(true);

    if (await annulerMaitriseAction(concept.atomId)) onAnnule();
    else setEnCours(false);
  }

  return (
    // Elle se pose au lieu d'apparaître : elle surgit en haut d'un écran dont
    // l'œil vient de partir vers la question suivante, et sans mouvement, la
    // seule chose qui la signale est le décalage du contenu — ce qui se lit
    // comme un défaut de chargement, pas comme une réponse au geste.
    <div
      role="status"
      className="rounded-champ bg-surface-papier mb-pas-8 px-pas-4 py-pas-3 md:px-pas-6 bande-qui-se-pose w-full"
    >
      <div className="gap-pas-2 flex flex-wrap items-baseline">
        <p className="text-petit text-stone-500">
          <span className="font-semibold text-stone-900">Sorti du cycle</span>, il reviendra dans
          trois mois.
        </p>

        {/* Le seul geste de la bande. En pilule, il pesait plus lourd que la
            phrase qu'il défait ; en fantôme, il ne se distinguait pas du gris
            autour. Souligné, il se lit comme ce qu'il est — un geste de texte,
            posé contre sa phrase — et garde la hauteur de cible d'un bouton. */}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-pas-2"
          disabled={enCours}
          onClick={() => void annuler()}
        >
          Annuler
        </Button>
      </div>

      {/* Le concept sur une ligne, à la mesure d'un texte : la carte a déjà
          avancé, il faut dire lequel, et cent caractères y suffisent. Bornée à
          deux lignes sur la largeur de la scène, la même phrase faisait un pavé
          qui chassait la question. */}
      <p className="text-petit line-clamp-1 max-w-4xl text-stone-500">{concept.concept}</p>
    </div>
  );
}
