"use client";

import { useTranslations } from "next-intl";
import { Cairn } from "@/components/cairn/cairn";
import { AttenteAbandonnee, ConceptsEnAttente } from "@/components/site/concepts-en-attente";
import { EchantillonDeQuestions } from "@/components/site/echantillon-de-questions";
import { EssaiSansConcept } from "@/components/site/essai-sans-concept";
import { PileDeConcepts } from "@/components/site/pile-de-concepts";
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
 * seule conversion de la page. Voir `GarderLesConcepts` — qui porte aussi,
 * depuis, la porte de sortie : elle fermait la descente, où elle flottait seule
 * sous l'échantillon. Les gestes qui terminent l'essai sont au même endroit.
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
  const t = useTranslations("site.essai.resultat");
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
      <header className="gap-pas-4 md:gap-pas-6 flex items-center">
        {/* Une pierre par concept, dessinée à partir de leurs identifiants :
            l'empilement est propre à ce dépôt-là et stable dans le temps. La
            dernière se pose en arrivant, et c'est elle qui porte le lichen.

            **Il se mesure en largeur.** Sa vue est aussi large qu'un cairn et
            aussi haute qu'il a de pierres : bornée en hauteur, une pile d'une
            seule pierre devient un galet de deux cents pixels de large qui
            écrase le titre d'à côté — ce qui est exactement ce qui s'est passé.
            Bornée en largeur, elle grandit vers le haut à mesure que les
            concepts s'ajoutent, ce qui est le geste du produit.

            **Il est passé à gauche du titre, centré sur sa hauteur.** Il tenait
            le coin haut droit, où deux choses claires se disputaient la même
            zone que la croix de fermeture, et où une pierre unique n'était plus
            qu'un trait lumineux flottant au-dessus du vide. À gauche du nombre
            qu'il dessine, les deux disent la même chose au même endroit — et le
            centrage tient quel que soit le nombre de pierres, puisque c'est la
            ligne qui centre et non une marge calculée.

            **Et il attend d'avoir deux pierres.** Une pierre seule n'est pas un
            empilement : la vue est large de cent unités pour une pierre haute de
            quinze, donc à un concept la figure est une barre claire posée sur un
            trait, qu'on lit comme une coquille plutôt que comme un cairn.
            L'élargir ne fait qu'allonger la barre. */}
        {combien > 1 ? (
          <Cairn
            nombre={combien}
            graines={avancement.concepts.map((concept) => concept.id)}
            clair
            className="h-auto w-16 shrink-0 md:w-20"
          />
        ) : null}

        <div className="gap-pas-2 flex min-w-0 flex-col">
          <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em] text-stone-50 tabular-nums">
            {t("titre", { nombre: combien })}
          </h2>

          <p className="text-corps max-w-xl text-stone-300">{t("promesse", { nombre: combien })}</p>
        </div>
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
    </div>
  );
}
