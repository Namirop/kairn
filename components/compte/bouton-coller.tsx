"use client";

import { useEffect, useState } from "react";
import { ClipboardPaste } from "lucide-react";

/**
 * Colle le presse-papier dans le champ qui le porte, posé au bout du champ.
 *
 * `readText` n'existe pas partout (Firefox ne l'expose pas aux pages, Chrome
 * peut refuser la permission) : le bouton ne s'affiche que là où l'API existe.
 * C'est un raccourci ; le clavier mobile propose le code, la frappe reste.
 *
 * Détection après le montage : le serveur ne connaît pas le presse-papier, et
 * l'interroger au rendu ferait diverger l'hydratation.
 */
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
  const [disponible, setDisponible] = useState(false);

  useEffect(() => {
    setDisponible(
      typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function",
    );
  }, []);

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
