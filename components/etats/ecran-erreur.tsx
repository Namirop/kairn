import type { ReactNode } from "react";

/**
 * Écran d'erreur. Il dit ce qui s'est passé et comment continuer. Il ne
 * s'excuse pas, et il ne montre jamais la trace technique à l'utilisateur.
 */
export function EcranErreur({
  code,
  titre,
  explication,
  actions,
}: {
  code: string;
  titre: string;
  explication: string;
  actions: ReactNode;
}) {
  return (
    <div className="px-pas-4 py-pas-12 mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center">
      <span className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">{code}</span>
      <h1 className="mt-pas-4 font-display text-h1-app leading-tight font-bold">{titre}</h1>
      <p className="mt-pas-3 text-stone-500">{explication}</p>
      <div className="mt-pas-8 gap-pas-3 flex flex-col sm:flex-row">{actions}</div>
    </div>
  );
}
