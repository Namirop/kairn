"use client";

import { Button } from "@/components/ui/button";

/**
 * L'explication du principe, montrée une seule fois.
 *
 * Elle passe en plein écran plutôt qu'en bandeau parce qu'elle n'arrive qu'une
 * fois et qu'elle dit une chose contre-intuitive : s'entraîner ne fait pas
 * avancer. Quelqu'un qui l'ignore croirait perdre son temps, ou pire, croirait
 * en gagner.
 *
 * Ensuite, une ligne discrète et permanente suffit — voir `TourDentrainement`.
 */
export function PrincipeDeLentrainement({ onCommencer }: { onCommencer: () => void }) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col">
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">Entraînement</p>

      <h1 className="mt-pas-4 text-h1-app leading-tight font-bold text-stone-900">
        Autant de questions que tu veux, sans conséquence
      </h1>

      <div className="mt-pas-6 gap-pas-4 text-corps flex max-w-lg flex-col leading-relaxed text-stone-500">
        <p>
          L&apos;entraînement pioche dans les autres questions de tes concepts. Rien de ce que tu y
          fais ne change ton planning : aucune échéance ne bouge, aucun concept n&apos;avance ni ne
          recule.
        </p>
        <p>
          C&apos;est voulu. Répondre juste trois fois en dix minutes prouve que tu tiens la réponse
          en tête, pas que tu la sauras dans trois semaines. Seule la session du jour mesure ça.
        </p>
      </div>

      <div className="mt-pas-12">
        <Button onClick={onCommencer} className="w-full sm:w-auto">
          Commencer
        </Button>
      </div>
    </section>
  );
}
