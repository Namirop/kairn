"use client";

import { useEffect, useState } from "react";
import { PileEnConstruction } from "@/components/cairn/pile-en-construction";
import { Button } from "@/components/ui/button";
import type { EtatDeLAttente } from "@/lib/depots/rythme-de-lattente";

/**
 * Les quelques secondes où le découpage tourne.
 *
 * C'est le moment le plus fragile du produit : la seule page qui convertit, et
 * une attente qu'on ne contrôle pas. Mesurée sur trois semaines de production,
 * elle va de 2,5 à 15 secondes, avec 6,3 de médiane — jamais instantanée, jamais
 * la même. Un écran immobile fait croire que rien ne se passe, et on ferme
 * l'onglet juste avant le résultat.
 *
 * Deux choses le tiennent, et elles répondent à deux manques différents.
 *
 * **Un empilement qui se construit**, à la place du titre. C'est le geste du
 * produit — une pierre, puis une autre — et il bouge vraiment, là où six barres
 * grises qui pulsent avaient fini par ressembler à une page qui n'arrive pas à
 * charger. Le même composant sert déjà l'attente de l'application : l'attente
 * de Kairn a une forme, elle est la même partout.
 *
 * **La forme de ce qui arrive**, en dessous : des emplacements aux mesures des
 * concepts qui vont les remplacer, dans la grille où ils s'afficheront. Rien ne
 * saute au moment du remplacement.
 *
 * Ce qui occupe vraiment l'attente n'est plus ici. Une question de démonstration
 * y a vécu, posée au bout de trois secondes dans une attente qui en dure six :
 * elle avait donc trois secondes pour être lue et répondue, ce qui n'est le
 * temps de rien. Et elle disparaissait au passage à l'écriture des questions,
 * qui est l'attente longue — vingt secondes de médiane. Le jeu qui l'a
 * remplacée est monté par `ResultatDeLEssai`, au-dessus des deux étapes, parce
 * que c'est le seul endroit d'où l'on peut les traverser.
 *
 * La progression n'est pas racontée par étapes. On ne connaît pas l'avancement
 * réel d'une extraction — il n'y a qu'un appel, et il rend ou il ne rend pas —,
 * donc annoncer « lecture… découpage… » serait inventer une barre de progression
 * qui ne mesure rien. Ce qui est honnête, c'est de dire que ça travaille, de
 * montrer ce qui se prépare, et de le reconnaître quand c'est long.
 *
 * **Cet écran tient jusqu'à ce qu'on cesse vraiment de chercher.** Il change de
 * mots deux fois — à neuf secondes on reconnaît que c'est plus long, à quinze on
 * dit qu'on cherche encore —, mais il garde ses emplacements qui battent, parce
 * que l'interrogation continue derrière. Ce qui le remplaçait à quinze secondes,
 * c'était l'écran d'abandon : plus de squelette, plus de jeu, et « reviens plus
 * tard » alors qu'on interrogeait toujours. L'abandon a maintenant son propre
 * état, et il n'arrive qu'à quatre-vingt-dix secondes.
 */

/** Trois emplacements : le découpage moyen en rend trois à cinq. */
const EMPLACEMENTS = [
  ["w-full", "w-4/5"],
  ["w-11/12", "w-2/3"],
  ["w-full", "w-1/2"],
] as const;

/** Au-delà, on le reconnaît. Se taire plus longtemps ferait douter. */
const SECONDES_AVANT_EXCUSE = 9;

export function ConceptsEnAttente({ attente }: { attente: EtatDeLAttente }) {
  const [long, setLong] = useState(false);

  useEffect(() => {
    const excuse = setTimeout(() => setLong(true), SECONDES_AVANT_EXCUSE * 1000);

    return () => clearTimeout(excuse);
  }, []);

  return (
    <div className="gap-pas-6 md:gap-pas-8 flex flex-col" role="status" aria-live="polite">
      <div className="gap-pas-4 flex items-center">
        <PileEnConstruction className="w-10 shrink-0 md:w-14" />

        <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em] text-stone-900">
          {attente === "LONGUE" ? "Le découpage prend son temps." : "On découpe ton texte."}
        </h2>
      </div>

      <ul className="gap-pas-4 md:gap-x-pas-8 grid md:grid-cols-2" aria-hidden>
        {EMPLACEMENTS.map(([longue, courte], rang) => (
          // La même règle en tête que dans `PileDeConcepts` : ce squelette
          // annonce la liste qui va le remplacer, il doit en avoir la forme.
          <li key={rang} className="pt-pas-3 border-t border-stone-300/70">
            {/* Deux barres aux hauteurs d'une ligne de corps : ce qui arrive
                prend exactement cette place, donc rien ne saute. Le décalage
                d'animation évite le clignotement à l'unisson, qui se lit comme
                un défaut d'affichage plutôt que comme une attente. */}
            <span
              className={`mb-pas-2 block h-4 rounded-xs bg-stone-300/70 motion-safe:animate-pulse ${longue}`}
              style={{ animationDelay: `${rang * 180}ms` }}
            />
            <span
              className={`block h-4 rounded-xs bg-stone-300/50 motion-safe:animate-pulse ${courte}`}
              style={{ animationDelay: `${rang * 180 + 90}ms` }}
            />
          </li>
        ))}
      </ul>

      {/* La place est réservée : la phrase apparaît sans pousser ce qui suit.

          Trois paliers, du plus discret au plus explicite. Le dernier est le
          seul qui compte vraiment : il dit qu'on cherche toujours et qu'il n'y a
          rien à faire, ce qui est exactement ce que l'écran d'abandon laissait
          croire du contraire. */}
      <p className="text-petit min-h-5 max-w-2xl text-stone-500">
        {attente === "LONGUE"
          ? "On cherche encore. Tes concepts s'afficheront ici dès qu'ils arrivent, tu n'as rien à faire."
          : long
            ? "C'est plus long que d'habitude. Ça arrive, laisse-lui encore un instant."
            : "Quelques secondes. Tes concepts s'affichent ici même, pas dans un écran d'inscription."}
      </p>
    </div>
  );
}

/**
 * L'écran de l'abandon : on a cessé d'interroger, et on le dit.
 *
 * L'écran interrogeait soixante fois puis s'arrêtait sans rien changer à ce
 * qu'il montrait : les emplacements continuaient de battre, pour toujours, sur
 * la seule page qui convertit. Se taire indéfiniment est pire que dire qu'on ne
 * sait pas — le visiteur finit par croire à un produit cassé.
 *
 * Le cas arrive vraiment. Un job reporté parce que le plafond journalier
 * d'appels est atteint reste en file et repartira, mais pas dans la minute :
 * côté serveur c'est un report légitime, et rien ne s'est cassé.
 *
 * **Il ne s'affiche qu'à quatre-vingt-dix secondes, quand l'interrogation
 * s'arrête pour de bon.** Il apparaissait à quinze, alors qu'on continuait de
 * chercher toutes les cinq secondes : « reviens plus tard » était faux, et
 * retirer le squelette et le jeu faisait passer pour mort un écran qui
 * travaillait. Ce palier-là est maintenant tenu par `ConceptsEnAttente`, qui
 * garde ses emplacements et change de mots. Ici, le bouton est vraiment la seule
 * issue, et c'est pour ça qu'il est là.
 *
 * Ce qu'on dit est vrai au mot près. Le traitement tourne côté serveur, derrière
 * la réponse, et fermer l'onglet ne l'arrête pas. Le texte est en base, le
 * cookie de visite dure sept jours, et revenir sur la page suffit à retrouver
 * ses concepts — c'est déjà comme ça que l'écran se recharge.
 */
export function AttenteAbandonnee({ onVerifier }: { onVerifier: () => void }) {
  return (
    <div className="gap-pas-4 flex flex-col" role="status">
      <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em] text-stone-900">
        Le découpage prend son temps.
      </h2>

      <p className="text-corps max-w-xl text-stone-500">
        Ton texte n&apos;est pas perdu. Reviens sur cette page dans un moment : tes concepts
        t&apos;y attendront.
      </p>

      <div className="mt-pas-1">
        <Button type="button" variant="outline" onClick={onVerifier}>
          Vérifier maintenant
        </Button>
      </div>
    </div>
  );
}
