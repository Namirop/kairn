import type { ReactNode } from "react";
import Link from "next/link";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Le gabarit des deux pages légales.
 *
 * Elles ne sont pas du marketing : registre sobre, une colonne de lecture, pas
 * d'élément signature. Quelqu'un qui les ouvre cherche une information précise
 * et veut la trouver, pas être impressionné.
 *
 * Les rubriques à compléter sont marquées visiblement plutôt que remplies d'un
 * texte plausible. Une fausse adresse dans des mentions légales est pire que pas
 * de mentions : elle a l'air d'un engagement.
 */

export type RubriqueLegale = {
  titre: string;
  /** Ce qui est déjà vrai du produit et se dit sans attendre. */
  corps?: string[];
  /** Ce que Romain doit renseigner. Rendu comme un trou, pas comme du texte. */
  aRemplir?: string[];
};

export function PageLegale({
  titre,
  chapeau,
  rubriques,
  misAJour,
}: {
  titre: string;
  chapeau: string;
  rubriques: RubriqueLegale[];
  misAJour: ReactNode;
}) {
  return (
    <PileDePanneaux sol="papier">
      <Panneau surface="papier" mesure="texte" remplit className="md:py-pas-16">
        <h1 className="text-h1-app leading-tight font-bold text-stone-900">{titre}</h1>
        <p className="mt-pas-4 text-corps max-w-prose leading-relaxed text-stone-500">{chapeau}</p>

        {rubriques.map((rubrique) => (
          <section key={rubrique.titre} className="mt-pas-12">
            <h2 className="text-h2-app leading-snug font-bold text-stone-900">{rubrique.titre}</h2>

            {rubrique.corps?.map((paragraphe) => (
              <p
                key={paragraphe}
                className="mt-pas-3 text-corps max-w-prose leading-relaxed text-stone-800"
              >
                {paragraphe}
              </p>
            ))}

            {rubrique.aRemplir ? (
              <ul className="border-ember/40 mt-pas-4 pl-pas-4 gap-pas-2 flex flex-col border-l-2">
                {rubrique.aRemplir.map((manque) => (
                  <li key={manque} className="text-petit text-stone-500">
                    À compléter — {manque}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <p className="mt-pas-16 text-petit text-stone-500">{misAJour}</p>

        <div className="mt-pas-4">
          <Link
            href={ROUTES.accueil}
            className="rounded-galet text-petit text-stone-500 underline-offset-4 hover:underline focus-visible:underline"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </Panneau>
    </PileDePanneaux>
  );
}
