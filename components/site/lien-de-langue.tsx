"use client";

import { usePathname } from "next/navigation";
import { useLangue } from "@/lib/i18n/use-langue";

/**
 * Le passage d'une langue à l'autre, sur les pages publiques.
 *
 * Il vit dans le pied de la landing, avec les autres liens qu'on cherche en
 * bas de page : dans l'en-tête il pesait autant que « Se connecter », qui est
 * le geste. Il propose l'autre langue, nommée dans cette langue — quelqu'un qui ne lit
 * pas la page doit encore reconnaître la sienne. Un lien ordinaire et non un
 * menu : il n'y a que deux langues, et un menu pour un seul choix serait un
 * détour. Il mène à `/fr…` ou `/en…`, que le middleware retient en cookie
 * avant de servir la page : le choix vaut ensuite pour tout le site.
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
