import type { ReactNode } from "react";

/**
 * La réponse de référence, sur sa propre matière.
 *
 * Elle était posée derrière un filet vertical, comme une citation dans un
 * article : le filet ne dit rien, il ne fait qu'occuper la marge, et ce qu'il
 * accompagne ne ressort pas — or c'est le seul moment de l'écran où l'on vient
 * chercher un texte à lire.
 *
 * Elle prend donc la roche, la même que le rail : la matière qui, dans ce
 * produit, porte ce qui est établi. La carte de la question est claire et
 * demande ; ce bloc est sombre et répond. Aucun élément nouveau n'entre dans le
 * système — c'est la surface qui change de rôle.
 *
 * Le texte est borné à sa mesure de lecture même quand la colonne est large :
 * une question est un titre et peut s'étaler, une réponse est un paragraphe et
 * n'a rien à y gagner.
 */
export function BlocReponse({
  intitule = "La réponse",
  children,
}: {
  intitule?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-carte bg-surface-roche grain grain-clair p-pas-6 md:p-pas-8 relative max-w-3xl overflow-hidden">
      {/* Les jetons de code s'inversent ici, et seulement ici : de l'encre diluée
          sur la roche est plus sombre que la roche, donc invisible. */}
      <div className="[&_code]:bg-jeton-clair [&_code]:border-jeton-bord-clair relative z-10">
        <p className="text-mono font-mono tracking-[0.12em] text-stone-400 uppercase">{intitule}</p>

        <div className="mt-pas-3 text-corps max-w-prose leading-relaxed whitespace-pre-wrap text-stone-50">
          {children}
        </div>
      </div>
    </div>
  );
}
