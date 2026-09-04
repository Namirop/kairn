"use client";

import { useEffect, useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * La capture qu'on joint à un dépôt.
 *
 * Le champ de fichier sort du parcours au clavier comme à la souris : c'est le
 * bouton qui porte l'action, et deux entrées pour un même geste feraient
 * doublon dans la tabulation comme pour un lecteur d'écran.
 *
 * **Le fichier est tenu au-dessus, pas ici.** Un partage du système peut en
 * apporter un sans que personne l'ait choisi dans un sélecteur, et le
 * formulaire a besoin de son poids pour refuser avant l'envoi. Ce composant
 * montre ce qui est joint et le repose dans le champ ; il ne décide de rien.
 */
export function PieceJointe({
  fichier,
  onChoisir,
}: {
  fichier: File | null;
  onChoisir: (fichier: File | null) => void;
}) {
  const champ = useRef<HTMLInputElement>(null);

  /*
    Un fichier qui n'est pas passé par le sélecteur doit être posé à la main.

    `input.files` ne se règle que par un `DataTransfer` — c'est la seule façon,
    pour du code, de remplir un champ de fichier. Sans ça le nom s'afficherait,
    le formulaire partirait, et la capture resterait sur le carreau.

    La comparaison d'identité coupe la boucle : après un choix au sélecteur, le
    champ porte déjà ce fichier-là, et le réécrire relancerait l'effet.
  */
  useEffect(() => {
    const entree = champ.current;

    if (!entree) return;

    if (!fichier) {
      entree.value = "";
      return;
    }

    if (entree.files?.[0] === fichier) return;

    const transfert = new DataTransfer();

    transfert.items.add(fichier);
    entree.files = transfert.files;
  }, [fichier]);

  return (
    <div className="gap-pas-3 flex items-center">
      <input
        ref={champ}
        id="image"
        name="image"
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(evenement) => onChoisir(evenement.target.files?.[0] ?? null)}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => champ.current?.click()}>
        <Paperclip aria-hidden />
        {fichier ? "Changer la capture" : "Joindre une capture"}
      </Button>

      {fichier ? (
        <span className="gap-pas-2 text-petit flex items-center text-stone-500">
          <span className="max-w-48 truncate">{fichier.name}</span>
          <button
            type="button"
            aria-label="Retirer la capture"
            className="rounded-xs text-stone-500 transition-colors hover:text-stone-900"
            onClick={() => onChoisir(null)}
          >
            <X aria-hidden className="size-4" />
          </button>
        </span>
      ) : null}
    </div>
  );
}
