"use client";

import type { ReactNode, RefObject } from "react";
import { Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/fusion-des-classes";

/**
 * Le champ d'une pièce jointe : le sélecteur natif masqué, le bouton trombone
 * qui l'ouvre, le nom du fichier tronqué et de quoi le retirer.
 *
 * Le champ natif sort de la tabulation et de l'arbre d'accessibilité : c'est le
 * bouton qui porte l'action, pour un seul arrêt de tabulation.
 *
 * Il ne tient aucun état : qui l'emploie garde le fichier, la ref du champ, et
 * décide de ce que retirer veut dire.
 */
export function ChampDePieceJointe({
  champ,
  id,
  name,
  nom,
  libelle,
  libelleRetirer,
  onChoisir,
  onRetirer,
  desactive,
  className,
}: {
  champ: RefObject<HTMLInputElement | null>;
  id: string;
  name: string;
  /** Le nom du fichier joint, nul s'il n'y en a pas. */
  nom: string | null;
  libelle: ReactNode;
  libelleRetirer: string;
  onChoisir: (fichier: File | null) => void;
  onRetirer: () => void;
  desactive?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("gap-pas-3 flex items-center", className)}>
      <input
        ref={champ}
        id={id}
        name={name}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(evenement) => onChoisir(evenement.target.files?.[0] ?? null)}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={desactive}
        onClick={() => champ.current?.click()}
      >
        <Paperclip aria-hidden />
        {libelle}
      </Button>

      {nom ? (
        <span className="gap-pas-2 text-petit flex items-center text-stone-500">
          <span className="max-w-48 truncate">{nom}</span>
          <button
            type="button"
            aria-label={libelleRetirer}
            className="rounded-xs text-stone-500 transition-colors hover:text-stone-900"
            onClick={onRetirer}
          >
            <X aria-hidden className="size-4" />
          </button>
        </span>
      ) : null}
    </div>
  );
}
