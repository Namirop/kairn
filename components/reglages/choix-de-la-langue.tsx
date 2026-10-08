"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changerDeLangueAction } from "@/app/(app)/reglages/langue-action";
import type { Langue } from "@/lib/db/types";
import { LANGUES } from "@/lib/i18n/langues";
import { Reglage } from "./reglage";

/**
 * Chaque langue se nomme dans sa propre langue : quelqu'un qui ne lit pas
 * l'écran courant doit encore reconnaître la sienne.
 */
const NOMS: Record<Langue, string> = {
  // i18n-ignore — un nom de langue s'écrit dans cette langue, quelle que soit l'autre
  FR: "Français",
  EN: "English",
};

/**
 * La langue du compte, en deux choix posés côte à côte.
 *
 * Le même dessin que le sujet d'un retour — un radio natif habillé —, et le
 * même arrondi de saisie. Le choix s'enregistre au clic : il n'y a rien d'autre
 * à remplir, et un bouton « Enregistrer » pour un seul geste serait un péage.
 */
export function ChoixDeLaLangue({ langue }: { langue: Langue }) {
  const t = useTranslations("compte.reglages.langue");
  const router = useRouter();
  const [choisie, setChoisie] = useState(langue);
  const [enCours, demarrer] = useTransition();
  const [echec, setEchec] = useState(false);

  function choisir(suivante: Langue) {
    if (suivante === choisie) return;

    setChoisie(suivante);
    setEchec(false);
    demarrer(async () => {
      const { ok } = await changerDeLangueAction(suivante);

      if (!ok) {
        setChoisie(langue);
        setEchec(true);
        return;
      }

      router.refresh();
    });
  }

  return (
    <Reglage
      nom="langue"
      intitule={t("intitule")}
      explication={echec ? t("echec") : t("explication")}
      controle={
        <fieldset id="langue" className="gap-pas-2 flex border-0 p-0" disabled={enCours}>
          <legend className="sr-only">{t("intitule")}</legend>
          {LANGUES.map((candidate) => (
            <label
              key={candidate}
              lang={candidate === "EN" ? "en" : "fr"}
              className={`rounded-champ px-pas-3 py-pas-2 text-petit has-[:focus-visible]:border-accent cursor-pointer border transition-colors ${
                choisie === candidate
                  ? "border-accent bg-accent/10 text-stone-900"
                  : "border-stone-300 text-stone-500 hover:border-stone-500 hover:text-stone-900"
              }`}
            >
              <input
                type="radio"
                name="langue"
                value={candidate}
                checked={choisie === candidate}
                onChange={() => choisir(candidate)}
                className="sr-only"
              />
              {NOMS[candidate]}
            </label>
          ))}
        </fieldset>
      }
    />
  );
}
