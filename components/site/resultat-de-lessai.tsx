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
 * Ce que l'essai a donné : l'attente, les concepts, ou aucun des deux. Le cairn
 * y est dessiné des vrais identifiants, seul endroit public où il l'est.
 *
 * L'appel à garder vit dans le pied fixe de la fenêtre (`GarderLesConcepts`) :
 * au bout de la liste, il serait à deux écrans du pouce sur téléphone.
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
  // Les concepts s'affichent sans attendre les questions, qui arrivent après.
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
        {/* Borné en largeur, jamais en hauteur : sa vue grandit avec les
            pierres, et une pile d'une pierre deviendrait un galet géant. Il en
            attend deux : seule, une pierre se lit comme une barre. */}
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

      <EchantillonDeQuestions
        questions={avancement.questions}
        enCours={avancement.enCours}
        attente={attente}
        onVerifier={onVerifier}
      />
    </div>
  );
}
