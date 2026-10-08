import { Share, SquarePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GesteManuel } from "./environnement-dinstallation";

/**
 * Les chemins d'installation que le navigateur ne sait pas déclencher.
 *
 * Ils ne se ressemblent pas, et c'est pour ça qu'ils sont deux : sur un
 * téléphone d'Apple, l'entrée est cachée dans le menu de partage sous un nom qui
 * ne contient pas le mot « installer » ; sur un Mac, elle est dans le menu
 * Fichier. Décrire l'un à qui tient l'autre, c'est envoyer chercher un bouton
 * qui n'existe pas.
 *
 * **Les icônes remplacent les numéros sur le geste de partage**, et pas par
 * coquetterie : ce sont exactement les deux glyphes qu'on cherche des yeux dans
 * la barre du navigateur, et les nommer vaut mieux que les décrire. Le geste du
 * Mac n'a rien de tel à montrer — un menu s'y lit en toutes lettres — donc il se
 * numérote.
 */
export function GesteManuel({ geste }: { geste: GesteManuel }) {
  const t = useTranslations("tableau.commun.installation");

  if (geste === "dock") {
    return (
      <ol className="mt-pas-4 gap-pas-2 text-petit flex flex-col text-stone-500">
        <Etape rang={1}>{t("dockMenu")}</Etape>
        <Etape rang={2}>{t("dockChoix")}</Etape>
      </ol>
    );
  }

  return (
    <ol className="mt-pas-4 gap-pas-2 text-petit flex flex-col text-stone-500">
      <li className="gap-pas-2 flex items-center">
        <Share className="size-4 shrink-0 text-stone-900" aria-hidden />
        {t("partageMenu")}
      </li>
      <li className="gap-pas-2 flex items-center">
        <SquarePlus className="size-4 shrink-0 text-stone-900" aria-hidden />
        {t("partageChoix")}
      </li>
    </ol>
  );
}

function Etape({ rang, children }: { rang: number; children: React.ReactNode }) {
  return (
    <li className="gap-pas-2 flex items-center">
      <span aria-hidden className="text-mono w-4 shrink-0 font-mono text-stone-900 tabular-nums">
        {rang}
      </span>
      {children}
    </li>
  );
}
