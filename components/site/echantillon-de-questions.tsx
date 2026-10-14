"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useArriveeDesQuestions } from "@/components/site/use-arrivee-des-questions";
import { CarteDeLEchantillon } from "@/components/site/carte-de-lechantillon";
import { parOrdreDeFormat } from "@/components/depots/ordre-des-formats";
import { EnEcriture } from "@/components/site/echantillon-en-attente";
import { unParFormat } from "@/lib/domain/formats-distincts";
import type { QuestionDeVitrine } from "@/lib/db/depot-de-visite";
import type { EtatDeLAttente } from "@/lib/depots/rythme-de-lattente";

/**
 * Les questions écrites sur l'un des concepts de l'essai, derrière leurs noms
 * de format : le visiteur clique, la question change, et il comprend la
 * rotation sans explication. Les quatre sont déjà écrites (un seul appel), en
 * montrer une seule n'économiserait rien.
 *
 * Un format n'y paraît qu'une fois (`unParFormat`), dans un ordre fixe
 * (`parOrdreDeFormat`) : deux formats identiques côte à côte contrediraient la
 * démonstration. L'attente s'arrête avec l'interrogation, à 90 s, pour ne pas
 * battre indéfiniment sous des concepts déjà affichés.
 *
 * Des boutons `aria-pressed`, pas des onglets : le motif ARIA des onglets
 * impose les flèches et un `tabindex` mouvant, et à demi implémenté il retire
 * au clavier ce que la souris garde.
 */

export function EchantillonDeQuestions({
  questions,
  enCours,
  attente,
  onVerifier,
}: {
  questions: QuestionDeVitrine[];
  /** L'écriture tourne encore : les questions arrivent après les concepts. */
  enCours: boolean;
  /** Où en est l'interrogation, pour ne pas battre après qu'elle s'est arrêtée. */
  attente: EtatDeLAttente;
  onVerifier: () => void;
}) {
  const t = useTranslations("site.essai");
  const [rang, setRang] = useState(0);

  const montrables = parOrdreDeFormat(unParFormat(questions));
  // Les questions arrivent après les concepts, donc sous le pli : on va les
  // chercher. Voir `useArriveeDesQuestions`.
  const ancre = useArriveeDesQuestions(montrables.length);

  if (montrables.length === 0) {
    return enCours ? (
      <EnEcriture abandonnee={attente === "ABANDONNEE"} onVerifier={onVerifier} />
    ) : null;
  }

  const montree = montrables[Math.min(rang, montrables.length - 1)];

  return (
    <section ref={ancre} className="gap-pas-3 scroll-mt-pas-6 flex flex-col">
      <header className="gap-pas-2 flex flex-col">
        <h3 className="font-display text-h1-app leading-tight font-bold tracking-[-0.02em] text-stone-50 tabular-nums">
          {t("echantillon.titre", { nombre: montrables.length })}
        </h3>

        {/* Sans mesure maximale, par exception : c'est une légende d'une ligne
            (717 px dans une fenêtre de 800), pas un paragraphe. Pliée, elle
            ferait un bloc et pousserait les formats vers le bas. */}
        <p className="text-petit text-stone-300">{t("echantillon.rotation")}</p>
      </header>

      {montree ? (
        <>
          {/* Le bouton actif partage la surface de la carte qu'il commande :
              c'est ce qui les relie sans qu'aucune bordure ait à le dire. */}
          {montrables.length > 1 ? (
            /* Sur téléphone, quatre formats ne tiennent pas sur une ligne et
               `flex-wrap` laisserait un nom orphelin : deux colonnes de la
               largeur de leur contenu plient deux et deux. */
            <div
              role="group"
              aria-label={t("echantillon.formats")}
              className="gap-pas-1 grid grid-cols-[repeat(2,max-content)] justify-items-start md:flex md:flex-wrap"
            >
              {montrables.map((question, position) => (
                <button
                  key={`${question.format}-${position}`}
                  type="button"
                  aria-pressed={position === rang}
                  onClick={() => setRang(position)}
                  className={`rounded-galet px-pas-3 text-mono h-8 font-mono tracking-[0.14em] uppercase transition-colors ${
                    position === rang
                      ? "bg-stone-700 text-stone-50"
                      : "text-stone-300 hover:bg-stone-700/60 hover:text-stone-50"
                  }`}
                >
                  {t(`libelleFormat.${question.format}`)}
                </button>
              ))}
            </div>
          ) : null}

          <CarteDeLEchantillon question={montree.question} options={montree.options} />
        </>
      ) : null}
    </section>
  );
}
