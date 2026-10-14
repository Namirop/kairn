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
 * Ce que l'essai a donné : l'attente, les concepts, ou aucun des deux. Rendu
 * dans `FenetreDeLEssai`.
 *
 * Le compte de concepts est accompagné du cairn, dessiné à partir de leurs
 * identifiants : le seul endroit public où l'élément signature porte du vrai
 * contenu. Les sections se séparent par du vide, jamais par un filet.
 *
 * L'appel à garder n'est pas ici mais dans le pied de la fenêtre, qui ne défile
 * pas : au bout de la liste, il serait à deux écrans du pouce sur téléphone.
 * Voir `GarderLesConcepts`.
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
    On montre ce qui existe dès qu'il existe : les concepts arrivent avant les
    questions, et attendre les secondes pour afficher les premiers retarderait
    tout le résultat.
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
        {/* Le cairn se borne en largeur, jamais en hauteur : sa vue est aussi
            haute qu'il a de pierres, et bornée en hauteur une pile d'une pierre
            deviendrait un galet géant qui écrase le titre.

            Il attend deux pierres : la vue fait cent unités de large pour une
            pierre de quinze de haut, et une pierre seule se lit comme une barre,
            pas comme un cairn. */}
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

      {/* De vraies questions sur l'un des concepts : la page montre sous quelle
          forme on te les reposera. */}
      <EchantillonDeQuestions
        questions={avancement.questions}
        enCours={avancement.enCours}
        attente={attente}
        onVerifier={onVerifier}
      />
    </div>
  );
}
