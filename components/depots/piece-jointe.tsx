"use client";

import { useEffect, useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { LibelleQuiSeRaccourcit } from "@/components/depots/libelle-qui-se-raccourcit";
import { Button } from "@/components/ui/button";

/**
 * La capture qu'on joint à un dépôt.
 *
 * Le champ de fichier sort de la tabulation et de l'arbre d'accessibilité :
 * c'est le bouton qui porte l'action, sans doublon.
 *
 * Le fichier est tenu par le formulaire : un partage du système peut en
 * apporter un sans sélecteur, et le formulaire a besoin de son poids pour
 * refuser avant l'envoi.
 */
export function PieceJointe({
  fichier,
  onChoisir,
}: {
  fichier: File | null;
  onChoisir: (fichier: File | null) => void;
}) {
  const t = useTranslations("depots.formulaire.pieceJointe");
  const champ = useRef<HTMLInputElement>(null);

  /*
    Un fichier venu d'ailleurs que le sélecteur doit être posé dans le champ,
    sinon il ne part pas avec le formulaire. Un `DataTransfer` est le seul moyen
    de régler `input.files` par code. La comparaison d'identité évite de
    réécrire un fichier que le sélecteur vient d'y mettre.
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
        <LibelleQuiSeRaccourcit
          complet={fichier ? t("changer") : t("joindre")}
          court={fichier ? t("changerCourt") : t("joindreCourt")}
        />
      </Button>

      {fichier ? (
        <span className="gap-pas-2 text-petit flex items-center text-stone-500">
          <span className="max-w-48 truncate">{fichier.name}</span>
          <button
            type="button"
            aria-label={t("retirer")}
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
