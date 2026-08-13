import type { ReactNode } from "react";

/**
 * Une section de l'écran d'administration : un intitulé, une ligne de contexte,
 * du contenu dense.
 *
 * Le registre est celui d'un écran interne, et il est volontairement l'inverse
 * de celui du produit : pas de police display, pas d'accent, pas d'élément
 * signature. Le lecteur n'est pas à convaincre, il est à informer — ce qu'on lui
 * doit, c'est de la densité et des libellés qui se scannent.
 */
export function Section({
  intitule,
  contexte,
  children,
}: {
  intitule: string;
  contexte?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-pas-12 first:mt-0">
      <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">{intitule}</h2>
      {contexte ? <p className="mt-pas-1 text-petit text-stone-500">{contexte}</p> : null}
      <div className="mt-pas-4">{children}</div>
    </section>
  );
}

/**
 * Une mesure : son libellé, son chiffre.
 *
 * Les chiffres sont en `tabular-nums` pour que les colonnes s'alignent d'une
 * ligne à l'autre — sans quoi l'œil doit relire chaque valeur au lieu de
 * comparer les hauteurs.
 */
export function Mesure({ intitule, valeur }: { intitule: string; valeur: string }) {
  return (
    <div className="gap-pas-4 py-pas-2 flex items-baseline justify-between border-b border-stone-300 last:border-b-0">
      <dt className="text-petit text-stone-500">{intitule}</dt>
      <dd className="text-corps font-mono tabular-nums">{valeur}</dd>
    </div>
  );
}
