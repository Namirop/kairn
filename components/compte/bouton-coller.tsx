"use client";

import { useSyncExternalStore } from "react";
import { ClipboardPaste } from "lucide-react";

/**
 * Un raccourci, affiché seulement là où `readText` existe (pas sur Firefox) ;
 * le clavier mobile propose aussi le code. Le serveur rend sans bouton, le
 * client l'ajoute après l'hydratation (`useSyncExternalStore`).
 */
/** L'API ne change pas pendant la vie de la page. */
function sansAbonnement(): () => void {
  return () => {};
}

function lectureDisponible(): boolean {
  return typeof navigator.clipboard?.readText === "function";
}

function jamaisAuServeur(): boolean {
  return false;
}

export function BoutonColler({
  onTexte,
  intitule,
  className,
}: {
  onTexte: (texte: string) => void;
  /** L'icône seule ne dit rien au lecteur d'écran. */
  intitule: string;
  className?: string;
}) {
  const disponible = useSyncExternalStore(sansAbonnement, lectureDisponible, jamaisAuServeur);

  if (!disponible) return null;

  async function coller() {
    try {
      onTexte(await navigator.clipboard.readText());
    } catch (erreur: unknown) {
      // Un refus de permission n'est pas une panne.
      console.info("Le presse-papier n'a pas pu être lu.", erreur);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void coller()}
      aria-label={intitule}
      title={intitule}
      className={`rounded-galet hover:bg-surface-ombre inline-flex size-11 items-center justify-center text-stone-500 transition-colors hover:text-stone-900 ${className ?? ""}`}
    >
      <ClipboardPaste className="size-4" aria-hidden />
    </button>
  );
}
