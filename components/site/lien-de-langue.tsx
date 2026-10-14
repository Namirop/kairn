"use client";

import { usePathname } from "next/navigation";
import { useLangue } from "@/lib/i18n/use-langue";

/**
 * Le passage à l'autre langue, sur les pages publiques. L'autre langue est
 * nommée dans cette langue : qui ne lit pas la page doit reconnaître la sienne.
 * Il mène à `/fr…` ou `/en…`, que le middleware retient en cookie.
 *
 * `<a>` et non `Link` : le changement de langue doit repasser par le
 * middleware et recharger les textes, ce qu'une navigation client ne ferait pas.
 */
export function LienDeLangue() {
  const langue = useLangue();
  const chemin = usePathname();
  const sansPrefixe = chemin.replace(/^\/en(?=\/|$)/, "") || "/";
  const cible =
    langue === "EN"
      ? `/fr${sansPrefixe === "/" ? "" : sansPrefixe}`
      : `/en${sansPrefixe === "/" ? "" : sansPrefixe}`;

  return (
    <a
      href={cible}
      hrefLang={langue === "EN" ? "fr" : "en"}
      lang={langue === "EN" ? "fr" : "en"}
      className="rounded-galet text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
    >
      {/* i18n-ignore — l'autre langue se nomme dans sa propre langue */}
      {langue === "EN" ? "Français" : "English"}
    </a>
  );
}
