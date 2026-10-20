"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { LibelleQuiSeRaccourcit } from "@/components/depots/libelle-qui-se-raccourcit";
import { ChampDePieceJointe } from "@/components/formulaires/champ-de-piece-jointe";

/**
 * Fichier tenu par le formulaire : un partage peut l'apporter sans sélecteur,
 * et son poids sert à refuser avant l'envoi.
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

  // Un fichier hors sélecteur doit être posé dans le champ pour partir ; seul un
  // `DataTransfer` règle `input.files` par code.
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
    <ChampDePieceJointe
      champ={champ}
      id="image"
      name="image"
      nom={fichier?.name ?? null}
      libelle={
        <LibelleQuiSeRaccourcit
          complet={fichier ? t("changer") : t("joindre")}
          court={fichier ? t("changerCourt") : t("joindreCourt")}
        />
      }
      libelleRetirer={t("retirer")}
      onChoisir={onChoisir}
      onRetirer={() => onChoisir(null)}
    />
  );
}
