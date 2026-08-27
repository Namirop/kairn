"use client";

import { useEffect, useState } from "react";
import { ClipboardPaste } from "lucide-react";

/**
 * Colle le presse-papier dans le champ qui le porte.
 *
 * Il vit **dans** le champ, au bout à droite, et pas au-dessus en toutes
 * lettres : c'est un geste sur ce champ-là, et une action posée à côté de son
 * étiquette se lit comme une seconde étiquette. À l'intérieur, sa place dit
 * déjà sur quoi elle agit — c'est la convention de tous les champs qui portent
 * une action, et elle n'a pas besoin d'un mot.
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
      // Un refus de permission n'est pas une panne : le champ reste là, et la
      // frappe aussi. On trace sans rien afficher — il n'y a rien à corriger.
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
