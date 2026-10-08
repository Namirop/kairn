"use client";

import { EXEMPLES_DE_DEPOT } from "@/lib/domain/invites-de-depot";
import { useLangue } from "@/lib/i18n/use-langue";
import { cn } from "@/lib/utils";

/**
 * L'onboarding, et il tient là.
 *
 * Pas de visite guidée au premier lancement : trois fenêtres qu'on enchaîne sans
 * lire ne laissent rien, et retardent le seul moment qui compte — voir le
 * produit fonctionner. Le premier écran de dépôt fait le travail tout seul.
 *
 * Les trois exemples sont volontairement sans rapport entre eux. C'est le
 * contraste qui porte le message « on peut déposer n'importe quoi », et il le
 * porte mieux qu'une phrase qui le dirait, parce qu'on le comprend en cliquant
 * plutôt qu'en lisant.
 *
 * Ils remplissent le champ au lieu de déposer directement : le geste reste
 * celui de l'utilisateur, et il peut encore modifier ou renoncer.
 */
export function ExemplesDeDepot({ onChoisir }: { onChoisir: (texte: string) => void }) {
  return (
    <div>
      <p className="text-corps text-stone-900">
        Dépose la première chose que tu veux retenir. N&apos;importe quoi fait l&apos;affaire.
      </p>

      <PucesDExemples onChoisir={onChoisir} className="mt-pas-3" />
    </div>
  );
}

/**
 * Les trois puces seules, sans la phrase qui les introduit.
 *
 * Elles servent deux fois : au premier dépôt de l'application, sous la consigne
 * d'onboarding, et sous le champ de l'essai public, où le panneau a déjà dit ce
 * qu'on attend et où il ne reste qu'à lever la panne d'inspiration. Deux
 * contextes, deux phrases d'introduction ; les puces, elles, ne changent pas —
 * c'est le même contraste de trois natures sans rapport qui porte le message.
 */
export function PucesDExemples({
  onChoisir,
  className,
}: {
  onChoisir: (texte: string) => void;
  className?: string;
}) {
  const langue = useLangue();

  return (
    <ul className={cn("gap-pas-2 flex flex-wrap", className)}>
      {EXEMPLES_DE_DEPOT[langue].map((exemple) => (
        <li key={exemple.etiquette}>
          <button
            type="button"
            onClick={() => onChoisir(exemple.texte)}
            className="rounded-galet px-pas-3 py-pas-2 text-petit hover:border-accent focus-visible:border-accent border border-stone-300 text-stone-500 transition-colors hover:text-stone-900"
          >
            {exemple.etiquette}
          </button>
        </li>
      ))}
    </ul>
  );
}
