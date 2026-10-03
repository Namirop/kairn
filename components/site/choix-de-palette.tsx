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
 * Le choix tient dans l'URL **et** survit à la navigation : le paramètre permet
 * d'envoyer un lien qui montre exactement ce qu'on regarde, le stockage local le
 * garde d'un écran à l'autre. Sans lui, l'application perdait la palette au
 * premier lien cliqué, ce qui rend toute comparaison impossible là où il y a
 * justement le plus d'écrans à comparer.
 */

const CLE = "kairn-palette-essai";

const PALETTES = [
  { cle: "", nom: "Production" },
  { cle: "versant", nom: "A · Versant" },
  { cle: "lavis", nom: "C · Lavis" },
] as const;

/** Une valeur connue, ou rien. Une clé rangée à la main ne fait pas foi. */
function connue(valeur: string | null): string {
  return PALETTES.some((palette) => palette.cle === (valeur ?? "")) ? (valeur ?? "") : "";
}

/**
 * Ce que l'écran doit porter : l'URL d'abord, la mémoire ensuite.
 *
 * L'URL gagne parce qu'un lien doit montrer ce qu'il promet, y compris quand
 * elle demande la production alors que la mémoire tient une palette.
 */
function palettePosee(): string {
  if (typeof window === "undefined") return "";

  const parametres = new URLSearchParams(window.location.search);

  if (parametres.has("couleur")) return connue(parametres.get("couleur"));

  try {
    return connue(window.localStorage.getItem(CLE));
  } catch {
    // Navigation privée, stockage refusé : on retombe sur la production.
    return "";
  }
}

export function ChoixDePalette() {
  const [choisie, setChoisie] = useState("");

  useEffect(() => {
    const posee = palettePosee();

    setChoisie(posee);

    if (posee) document.documentElement.dataset.palette = posee;
    else delete document.documentElement.dataset.palette;

    try {
      window.localStorage.setItem(CLE, posee);
    } catch {
      // Sans stockage, le choix ne suit pas la navigation. Il reste dans l'URL.
    }
  }, []);

  const changer = (cle: string) => {
    try {
      window.localStorage.setItem(CLE, cle);
    } catch {
      // Voir plus haut : l'URL suffit à cette navigation-ci.
    }

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
