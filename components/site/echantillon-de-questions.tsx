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
 * Les questions d'un concept de l'essai, derrière leurs noms de format :
 * cliquer change la question, et la rotation se comprend sans explication. Les
 * quatre viennent du même appel : en montrer une seule n'économiserait rien.
 * Un format n'y paraît qu'une fois, sans quoi la démonstration se contredit.
 * L'attente s'arrête à 90 s pour ne pas battre sous des concepts déjà affichés.
 *
 * Des boutons `aria-pressed`, pas des onglets : le motif ARIA des onglets
 * impose flèches et `tabindex` mouvant, et à demi fait il prive le clavier.
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
  // Elles arrivent après les concepts, sous le pli : on va les chercher.
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

        {/* Sans mesure maximale, par exception : une légende d'une ligne
            (717 px à 800 de fenêtre), qui pliée repousserait les formats. */}
        <p className="text-petit text-stone-300">{t("echantillon.rotation")}</p>
      </header>

      {montree ? (
        <>
          {/* Le bouton actif partage la surface de sa carte : le lien se passe de bordure. */}
          {montrables.length > 1 ? (
            /* Sur téléphone, `flex-wrap` laisserait un format orphelin : deux
               colonnes plient deux et deux. */
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
