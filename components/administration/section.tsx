import type { ReactNode } from "react";

/**
 * Une section de l'écran d'administration : un intitulé, une ligne de contexte,
 * du contenu dense.
 *
 * Le registre est celui d'un écran interne, et il est volontairement l'inverse
 * de celui du produit : pas de police display, pas d'accent, pas d'élément
 * signature. Le lecteur n'est pas à convaincre, il est à informer — ce qu'on lui
 * doit, c'est de la densité et des libellés qui se scannent.
 *
 * L'intitulé est en encre pleine et non en petites capitales grises. Toutes les
 * sections portaient le même gris que leur propre ligne de contexte, au même
 * corps : rien n'accrochait l'œil, et l'écran se lisait comme une seule coulée.
 * Un titre doit peser plus lourd que ce qu'il annonce.
 *
 * Le filet en tête sépare les sujets. C'est le seul endroit où la hiérarchie de
 * cet écran a besoin d'un trait : entre deux sections, l'espace seul ne suffit
 * pas quand le contenu est lui-même fait de lignes réglées.
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
    <section className="mt-pas-12 pt-pas-6 border-t border-stone-300 first:mt-0 first:border-t-0 first:pt-0">
      <h2 className="text-corps font-semibold text-stone-900">{intitule}</h2>
      {contexte ? (
        <p className="mt-pas-1 text-petit max-w-prose text-stone-500">{contexte}</p>
      ) : null}
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
