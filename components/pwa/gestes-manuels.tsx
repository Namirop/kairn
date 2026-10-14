import { Share, SquarePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GesteManuel } from "./environnement-dinstallation";

/**
 * Les chemins d'installation que le navigateur ne sait pas déclencher : sur
 * iPhone, le menu de partage, sous un nom sans le mot « installer » ; sur Mac,
 * le menu Fichier. Le partage montre les deux glyphes qu'on cherche dans la
 * barre du navigateur ; le Mac, dont le menu se lit en toutes lettres, se
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
