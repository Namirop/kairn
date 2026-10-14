import type { ReactNode } from "react";

/**
 * Une section de l'écran d'administration. Registre interne, volontairement
 * l'inverse du produit : pas de display, pas d'accent, de la densité. Le filet
 * en tête sépare les sujets, l'espace seul ne suffisant pas entre des contenus
 * faits de lignes réglées.
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

/** Une mesure : son libellé, son chiffre en `tabular-nums` pour aligner les colonnes. */
export function Mesure({ intitule, valeur }: { intitule: string; valeur: string }) {
  return (
    <div className="gap-pas-4 py-pas-2 flex items-baseline justify-between border-b border-stone-300 last:border-b-0">
      <dt className="text-petit text-stone-500">{intitule}</dt>
      <dd className="text-corps font-mono tabular-nums">{valeur}</dd>
    </div>
  );
}
