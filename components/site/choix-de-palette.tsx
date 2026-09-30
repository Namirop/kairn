"use client";

import { useEffect, useState } from "react";

/**
 * Le sélecteur de palette, et il n'existe que sur cette branche.
 *
 * **À retirer avant que quoi que ce soit arrive sur `main`.** Il sert à une
 * seule chose : regarder les deux pistes sur la vraie page, sur un vrai
 * téléphone, avec les vraies polices et le vrai paysage — ce qu'aucune maquette
 * ne peut montrer. Une fois la piste choisie, ses jetons deviennent la palette
 * et ce fichier disparaît avec l'autre.
 *
 * Il pose `data-palette` sur la racine, ce qui suffit : les deux palettes ne
 * sont que des surcharges de variables, et tout le produit lit ses surfaces
 * depuis ces variables-là. Rien d'autre n'a à savoir qu'elles existent.
 *
 * Le choix tient dans l'URL plutôt que dans un état : c'est ce qui permet
 * d'envoyer un lien qui montre exactement ce qu'on vient de regarder.
 */

const PALETTES = [
  { cle: "", nom: "Production" },
  { cle: "versant", nom: "A · Versant" },
  { cle: "lavis", nom: "C · Lavis" },
] as const;

function palettePosee(): string {
  if (typeof window === "undefined") return "";

  const voulue = new URLSearchParams(window.location.search).get("couleur") ?? "";

  return PALETTES.some((palette) => palette.cle === voulue) ? voulue : "";
}

export function ChoixDePalette() {
  const [choisie, setChoisie] = useState("");

  useEffect(() => {
    const posee = palettePosee();

    setChoisie(posee);

    if (posee) document.documentElement.dataset.palette = posee;
    else delete document.documentElement.dataset.palette;
  }, []);

  const changer = (cle: string) => {
    const url = new URL(window.location.href);

    if (cle) url.searchParams.set("couleur", cle);
    else url.searchParams.delete("couleur");

    window.location.href = url.toString();
  };

  return (
    <div className="gap-pas-1 p-pas-1 rounded-galet bg-surface-roche/90 fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 shadow-lg backdrop-blur">
      {PALETTES.map((palette) => (
        <button
          key={palette.cle}
          type="button"
          onClick={() => changer(palette.cle)}
          className={`rounded-galet px-pas-3 py-pas-2 text-mono font-mono transition-colors ${
            choisie === palette.cle
              ? "bg-stone-50 text-stone-900"
              : "text-stone-300 hover:text-stone-50"
          }`}
        >
          {palette.nom}
        </button>
      ))}
    </div>
  );
}
