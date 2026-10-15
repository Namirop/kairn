"use client";

import { useSyncExternalStore } from "react";
import { ClipboardPaste } from "lucide-react";

/**
 * Colle le presse-papier dans le champ qui le porte, posé au bout du champ.
 *
 * `readText` n'existe pas partout (Firefox ne l'expose pas aux pages, Chrome
 * peut refuser la permission) : le bouton ne s'affiche que là où l'API existe.
 * C'est un raccourci ; le clavier mobile propose le code, la frappe reste.
 *
 * Le serveur ne connaît pas le presse-papier : il rend sans bouton, et le client
 * ne l'ajoute qu'après l'hydratation, ce que `useSyncExternalStore` garantit.
 */
/** L'API ne change pas pendant la vie de la page : rien à écouter. */
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
  /** Ce qu'un lecteur d'écran entend : l'icône seule ne dit rien. */
  intitule: string;
  className?: string;
}) {
  const disponible = useSyncExternalStore(sansAbonnement, lectureDisponible, jamaisAuServeur);

  if (!disponible) return null;

  async function coller() {
    try {
      onTexte(await navigator.clipboard.readText());
    } catch (erreur: unknown) {
      // Un refus de permission n'est pas une panne : tracé, rien à afficher.
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
