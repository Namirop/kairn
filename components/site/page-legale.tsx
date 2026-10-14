import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BlocDetache } from "@/components/coquille/bloc-detache";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Le gabarit des deux pages légales : registre sobre, une colonne de lecture.
 *
 * Les rubriques à compléter sont marquées visiblement plutôt que remplies d'un
 * texte plausible : une fausse adresse dans des mentions légales a l'air d'un
 * engagement.
 */

export type RubriqueLegale = {
  titre: string;
  /** Ce qui est déjà vrai du produit et se dit sans attendre. */
  corps?: string[];
  /**
   * Des couples à mettre en regard (une finalité et sa base légale, une durée et
   * ce qu'elle borne), rendus en liste de définitions : c'est une information
   * qu'on cherche par balayage.
   */
  couples?: { terme: string; valeur: string }[];
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
  const t = useTranslations("legal.gabarit");

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

            {rubrique.couples ? (
              <dl className="mt-pas-4 gap-pas-4 grid max-w-prose sm:grid-cols-[1fr_auto]">
                {rubrique.couples.map((couple) => (
                  <Fragment key={couple.terme}>
                    <dt className="text-corps leading-relaxed text-stone-800">{couple.terme}</dt>
                    <dd className="text-mono border-t-0 font-mono text-stone-500 sm:text-right">
                      {couple.valeur}
                    </dd>
                  </Fragment>
                ))}
              </dl>
            ) : null}

            {rubrique.aRemplir ? (
              <BlocDetache ton="alerte" className="mt-pas-4">
                <ul className="gap-pas-2 flex flex-col">
                  {rubrique.aRemplir.map((manque) => (
                    <li key={manque} className="text-petit text-stone-500">
                      {t("aCompleter", { manque })}
                    </li>
                  ))}
                </ul>
              </BlocDetache>
            ) : null}
          </section>
        ))}

        <p className="mt-pas-16 text-petit text-stone-500">{misAJour}</p>

        <div className="mt-pas-4">
          <Link
            href={ROUTES.accueil}
            className="rounded-galet text-petit text-stone-500 underline-offset-4 hover:underline focus-visible:underline"
          >
            {t("retourAccueil")}
          </Link>
        </div>
      </Panneau>
    </PileDePanneaux>
  );
}
