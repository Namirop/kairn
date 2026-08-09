import type { ReactNode } from "react";

/**
 * Écran vide : un constat, un contexte, une action. Pas d'illustration, pas
 * d'emoji, pas de troisième phrase qui redit la deuxième.
 */
export function EtatVide({
  constat,
  contexte,
  action,
}: {
  constat: string;
  contexte?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-pas-6 py-pas-8 border border-dashed border-stone-300">
      <p className="text-stone-900">{constat}</p>
      {contexte ? <p className="mt-pas-1 text-petit text-stone-500">{contexte}</p> : null}
      {action ? <div className="mt-pas-4">{action}</div> : null}
    </div>
  );
}
