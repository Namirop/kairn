"use client";

import { useEffect, useState } from "react";

/**
 * Colle le presse-papier dans le champ voisin, quand le navigateur le permet.
 *
 * `readText` n'existe pas partout — Firefox ne l'expose pas aux pages, et Chrome
 * peut demander une permission puis se voir refuser. Le bouton ne s'affiche donc
 * que là où il marche, et disparaît ailleurs plutôt que d'échouer sous le doigt.
 * Ce n'est pas le seul chemin vers le champ : le clavier mobile propose le code
 * de lui-même, et la frappe reste possible. C'est un raccourci, pas un passage.
 *
 * La détection est faite après le montage : la même page rendue sur le serveur
 * ne sait rien du presse-papier, et afficher puis retirer le bouton ferait
 * sauter la mise en page.
 */
export function BoutonColler({ onTexte }: { onTexte: (texte: string) => void }) {
  const [disponible, setDisponible] = useState(false);

  useEffect(() => {
    setDisponible(typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function");
  }, []);

  if (!disponible) return null;

  async function coller() {
    try {
      onTexte(await navigator.clipboard.readText());
    } catch (erreur: unknown) {
      // Un refus de permission n'est pas une panne : le champ reste là, et la
      // frappe aussi. On trace sans rien afficher — il n'y a rien à corriger.
      console.info("Le presse-papier n'a pas pu être lu.", erreur);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void coller()}
      className="rounded-galet text-mono text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
    >
      Coller
    </button>
  );
}
