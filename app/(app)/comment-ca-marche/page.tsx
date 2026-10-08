import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { ROUTES } from "@/lib/auth/routes";
import type { Messages } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tableau.commentCaMarche");

  return { title: t("titre") };
}

/**
 * Le fonctionnement en entier, pour la minorité qui veut le lire.
 *
 * Elle existe pour ne pas charger le reste de l'interface : sans elle, chaque
 * écran serait tenté d'expliquer un bout du principe à qui ne l'a pas demandé.
 * Ceux qui n'ouvrent jamais cette page doivent comprendre le produit sans elle,
 * et c'est le travail des exemples de dépôt et des deux explications ponctuelles.
 *
 * Du texte, en une colonne de lecture. Pas d'illustration, pas de schéma : ce
 * qui se dit en trois phrases n'a pas besoin d'un diagramme.
 */

/** Les sections, dans l'ordre de la page ; leurs textes vivent dans les messages. */
const SECTIONS: (keyof Messages["tableau"]["commentCaMarche"]["sections"])[] = [
  "oubli",
  "decoupage",
  "rotation",
  "maitrise",
  "entrainement",
  "compte",
];

/** Chaque section porte deux paragraphes. */
const PARAGRAPHES = ["un", "deux"] as const;

export default async function PageCommentCaMarche() {
  const t = await getTranslations("tableau.commentCaMarche");

  return (
    <PileDePanneaux sol="papier">
      <Panneau surface="papier" mesure="texte" remplit className="md:py-pas-16">
        <h1 className="text-h1-app leading-tight font-bold text-stone-900">{t("titre")}</h1>
        <p className="mt-pas-4 text-corps max-w-prose leading-relaxed text-stone-500">
          {t("intro")}
        </p>

        {SECTIONS.map((section) => (
          <section key={section} className="mt-pas-12">
            <h2 className="text-h2-app leading-snug font-bold text-stone-900">
              {t(`sections.${section}.titre`)}
            </h2>
            {PARAGRAPHES.map((paragraphe) => (
              <p
                key={paragraphe}
                className="mt-pas-3 text-corps max-w-prose leading-relaxed text-stone-800"
              >
                {t(`sections.${section}.${paragraphe}`)}
              </p>
            ))}
          </section>
        ))}

        <div className="mt-pas-16">
          <Link
            href={ROUTES.reglages}
            className="rounded-galet text-petit text-stone-500 underline-offset-4 hover:underline focus-visible:underline"
          >
            {t("retour")}
          </Link>
        </div>
      </Panneau>
    </PileDePanneaux>
  );
}
