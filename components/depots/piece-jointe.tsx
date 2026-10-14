"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { LibelleQuiSeRaccourcit } from "@/components/depots/libelle-qui-se-raccourcit";
import { ChampDePieceJointe } from "@/components/formulaires/champ-de-piece-jointe";

/**
 * La capture qu'on joint à un dépôt.
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
