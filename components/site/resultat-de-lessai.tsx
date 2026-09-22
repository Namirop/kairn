"use client";

import { Cairn } from "@/components/cairn/cairn";
import { AttenteAbandonnee, ConceptsEnAttente } from "@/components/site/concepts-en-attente";
import { EchantillonDeQuestions } from "@/components/site/echantillon-de-questions";
import { EssaiSansConcept } from "@/components/site/essai-sans-concept";
import { PileDeConcepts } from "@/components/site/pile-de-concepts";
import { Button } from "@/components/ui/button";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";
import type { EtatDeLAttente } from "@/lib/depots/rythme-de-lattente";

/**
 * Ce que l'essai a donné : l'attente, les concepts, ou aucun des deux.
 *
 * **Tout ceci vit dans la fenêtre de l'essai, et plus dans la bande.** La bande
 * devait être quatre mises en page à elle seule — le formulaire sur deux
 * colonnes, l'attente pleine largeur, les concepts avec une seconde attente
 * imbriquée dedans, le résultat entier. Aucune ne pouvait être bien composée.
 * Voir `FenetreDeLEssai`, qui rend à la bande son unique travail.
 *
 * **Le compte de concepts n'est plus seul à porter le titre.** Il l'était, en
 * display, au-dessus d'une liste de paragraphes au corps d'une légende : un
 * grand nombre, puis plus rien qui ait d'échelle. Il est maintenant accompagné
 * du cairn, monté à autant de pierres qu'il y a de concepts et dessiné à partir
 * de leurs identifiants. Le chiffre et la figure disent la même chose, et c'est
 * le seul endroit public où l'élément signature du produit porte du vrai
 * contenu plutôt qu'une décoration.
 *
 * **La descente a trois temps de même forme** : un titre, une phrase qui
 * l'explique, puis l'objet. Les concepts, puis les questions. Ce qui les sépare
 * est du vide et non un filet — deux sujets ne se séparent jamais par une ligne
 * dans ce système.
 *
 * **L'appel à garder n'est plus au bout de la descente**, il est dans le pied
 * de la fenêtre, qui ne défile pas. Sur un téléphone, un appel posé à la fin
 * d'une liste de huit concepts se trouve à deux écrans du pouce, et c'est la
 * seule conversion de la page. Voir `GarderLesConcepts`.
 *
 * **Le jeu d'attente est parti.** Il occupait un panneau de dix-huit rem à
 * droite : on empilait des pierres à la souris pendant que le découpage
 * tournait. Ce qui manque pendant une attente n'est pas une occupation, c'est un
 * signe que quelqu'un travaille — et c'est ce que fait la phrase qui tourne,
 * pour rien et sans rien demander.
 */
export function ResultatDeLEssai({
  avancement,
  surRedepot,
  attente,
  onVerifier,
}: {
  avancement: AvancementDeLEssai | null;
  /** Repartir d'un champ vide. Ferme la fenêtre au passage. */
  surRedepot: () => void;
  /** Depuis combien de temps on attend, et si l'on cherche encore. */
  attente: EtatDeLAttente;
  onVerifier: () => void;
}) {
  /*
    On montre ce qui existe dès qu'il existe.

    L'essai se joue en deux temps — les concepts, puis les questions écrites sur
    le premier d'entre eux qui soit questionnable —, et attendre le second temps
    pour afficher le premier ferait payer à tout le monde l'ajout des questions :
    on verrait le résultat plus tard qu'avant, pour en avoir plus. C'est
    l'inverse de ce qu'on cherche.
  */
  const rienEncore = !avancement || avancement.concepts.length === 0;

  if (rienEncore && (!avancement || avancement.enCours)) {
    return attente === "ABANDONNEE" ? (
      <AttenteAbandonnee onVerifier={onVerifier} />
    ) : (
      <ConceptsEnAttente attente={attente} />
    );
  }

  if (!avancement || avancement.concepts.length === 0) {
    return avancement ? <EssaiSansConcept avancement={avancement} surRedepot={surRedepot} /> : null;
  }

  const combien = avancement.concepts.length;

  return (
    <div className="gap-pas-8 md:gap-pas-12 flex flex-col" role="status">
      <header className="gap-pas-4 md:gap-pas-8 flex items-start justify-between">
        <div className="gap-pas-3 flex min-w-0 flex-col">
          <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em] text-stone-50 tabular-nums">
            {combien} {combien === 1 ? "concept." : "concepts."}
          </h2>

          <p className="text-corps max-w-xl text-stone-300">
            {combien === 1
              ? "Il te sera reposé seul, au moment où tu allais l'oublier."
              : "Chacun sera reposé séparément, au moment où tu allais l'oublier."}
          </p>
        </div>

        {/* Une pierre par concept, dessinée à partir de leurs identifiants :
            l'empilement est propre à ce dépôt-là et stable dans le temps. La
            dernière se pose en arrivant, et c'est elle qui porte le lichen.

            **Il se mesure en largeur.** Sa vue est aussi large qu'un cairn et
            aussi haute qu'il a de pierres : bornée en hauteur, une pile d'une
            seule pierre devient un galet de deux cents pixels de large qui
            écrase le titre d'à côté — ce qui est exactement ce qui s'est passé.
            Bornée en largeur, elle grandit vers le haut à mesure que les
            concepts s'ajoutent, ce qui est le geste du produit. */}
        <Cairn
          nombre={combien}
          graines={avancement.concepts.map((concept) => concept.id)}
          clair
          className="h-auto w-20 shrink-0 md:w-28"
        />
      </header>

      <PileDeConcepts concepts={avancement.concepts} />

      {/* L'échantillon, et il ferme l'arc : ton texte, tes concepts, de vraies
          questions sur l'un d'eux. Sans lui, la page promettait qu'on te les
          repose sans jamais te montrer sous quelle forme. */}
      <EchantillonDeQuestions
        questions={avancement.questions}
        enCours={avancement.enCours}
        attente={attente}
        onVerifier={onVerifier}
      />

      {/* La porte de sortie, et elle est discrète à dessein.

          Elle a vécu dans le pied, à droite de l'appel à garder, où elle serrait
          la mention jusqu'à un mot par ligne sur un téléphone. Ici elle ferme la
          descente, après tout ce qu'il y avait à voir — c'est le seul endroit où
          proposer de recommencer à quelqu'un qu'on vient de convaincre ne coûte
          rien, parce qu'il a déjà tout lu. Elle ne s'affiche que lorsque la base
          l'accorde vraiment : deux essais par tranche de vingt-quatre heures. */}
      {avancement.peutRedeposer ? (
        <Button
          type="button"
          variant="linkClair"
          size="sm"
          className="self-start px-0"
          onClick={surRedepot}
        >
          Déposer autre chose
        </Button>
      ) : null}
    </div>
  );
}
