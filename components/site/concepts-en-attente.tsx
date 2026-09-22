"use client";

import { PileEnConstruction } from "@/components/cairn/pile-en-construction";
import { PhraseQuiTourne, usePhraseQuiTourne } from "@/components/site/phrase-qui-tourne";
import { Button } from "@/components/ui/button";
import type { EtatDeLAttente } from "@/lib/depots/rythme-de-lattente";

/**
 * Les quelques secondes où le découpage tourne, dans la fenêtre de l'essai.
 *
 * C'est le moment le plus fragile du produit : la seule page qui convertit, et
 * une attente qu'on ne contrôle pas. Mesurée sur trois semaines de production,
 * elle va de 2,5 à 15 secondes, avec 6,3 de médiane — jamais instantanée, jamais
 * la même. Un écran immobile fait croire que rien ne se passe, et on ferme
 * l'onglet juste avant le résultat.
 *
 * Trois choses le tiennent, et elles répondent à trois manques différents.
 *
 * **Un empilement qui se construit**, à côté du titre. C'est le geste du
 * produit — une pierre, puis une autre — et il bouge vraiment, là où six barres
 * grises qui pulsent avaient fini par ressembler à une page qui n'arrive pas à
 * charger. Le même composant sert déjà l'attente de l'application : l'attente de
 * Kairn a une forme, elle est la même partout.
 *
 * **Une voix**, en dessous : une phrase qui change toutes les trois secondes et
 * demie et dont le ton descend avec le temps. Elle a remplacé un jeu
 * d'empilement, qui demandait au visiteur de faire l'effort à la place du
 * produit au moment précis où le produit doit faire ses preuves. Elle ne demande
 * rien, se lit sans effort, et prouve la même chose — qu'il y a quelqu'un
 * derrière. Voir `phrases-dattente.ts`.
 *
 * **Une promesse stable**, tout en bas, et c'est la seule ligne que les lecteurs
 * d'écran entendent. Une ligne qui change toutes les trois secondes dans une
 * région `aria-live` se ferait lire à voix haute toutes les trois secondes : on
 * transformerait une attente en harcèlement.
 *
 * **Les emplacements en attente sont partis avec la fenêtre.** Trois squelettes
 * aux mesures des concepts annonçaient leur forme pour qu'aucun texte ne saute
 * au remplacement — la bonne règle dans une page. Dans une fenêtre, le
 * changement de hauteur **est** la révélation, et l'amortir revenait à la
 * cacher. Il ne reste donc plus une seule barre grise qui pulse dans tout
 * l'essai, ce qui était le premier défaut de l'écran précédent : deux systèmes
 * de squelettes à la fois, au moment même où on livre le résultat.
 *
 * La progression n'est pas racontée par étapes. On ne connaît pas l'avancement
 * réel d'une extraction — il n'y a qu'un appel, et il rend ou il ne rend pas —,
 * donc annoncer « lecture… découpage… » serait inventer une barre de progression
 * qui ne mesure rien. Ce qui est honnête, c'est de dire que ça travaille et de
 * le reconnaître quand c'est long.
 *
 * **Le titre ne bouge plus.** Il basculait sur « Le découpage prend son temps. »
 * à quinze secondes ; c'est maintenant la phrase qui porte cet aveu-là, et bien
 * plus finement. Un titre qui change pendant qu'on le lit coûte plus qu'il ne
 * dit.
 */
export function ConceptsEnAttente({ attente }: { attente: EtatDeLAttente }) {
  const phrase = usePhraseQuiTourne("DECOUPAGE");

  return (
    <div className="gap-pas-6 flex flex-col" role="status" aria-live="polite">
      <div className="gap-pas-4 flex items-center">
        <PileEnConstruction className="w-10 shrink-0 md:w-14" />

        <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em] text-stone-50">
          On découpe ton texte.
        </h2>
      </div>

      <PhraseQuiTourne phrase={phrase} className="text-stone-300" />

      <p className="text-petit min-h-5 max-w-2xl text-stone-400">
        {attente === "LONGUE"
          ? "On cherche encore. Tes concepts s'afficheront ici dès qu'ils arrivent, tu n'as rien à faire."
          : "Tes concepts s'affichent ici même, pas dans un écran d'inscription."}
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
 * chercher toutes les cinq secondes : « reviens plus tard » était faux, et tout
 * retirer faisait passer pour mort un écran qui travaillait. Ce palier-là est
 * maintenant tenu par `ConceptsEnAttente`, qui garde sa voix et change de mots.
 * Ici, le bouton est vraiment la seule issue, et c'est pour ça qu'il est là.
 *
 * Ce qu'on dit est vrai au mot près. Le traitement tourne côté serveur, derrière
 * la réponse, et fermer la fenêtre ne l'arrête pas. Le texte est en base, le
 * cookie de visite dure sept jours, et revenir sur la page suffit à retrouver
 * ses concepts.
 */
export function AttenteAbandonnee({ onVerifier }: { onVerifier: () => void }) {
  return (
    <div className="gap-pas-4 flex flex-col" role="status">
      <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em] text-stone-50">
        Le découpage prend son temps.
      </h2>

      <p className="text-corps max-w-xl text-stone-300">
        Ton texte n&apos;est pas perdu. Reviens sur cette page dans un moment : tes concepts
        t&apos;y attendront.
      </p>

      <div className="mt-pas-1">
        <Button type="button" variant="outlineClair" onClick={onVerifier}>
          Vérifier maintenant
        </Button>
      </div>
    </div>
  );
}
