import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Marque } from "@/components/coquille/marque";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { langueDepuisCode } from "@/lib/domain/langue-devinee";
import { EN_TETE_DU_CHEMIN, versionsDeLaPage } from "@/lib/i18n/adresses";
import { EN_TETE_DE_LANGUE } from "@/lib/i18n/langues";
import { MESSAGES } from "@/lib/i18n/messages";
import { TAILLE_DE_PARTAGE } from "@/lib/site/dessin-de-partage";

/**
 * La coquille publique.
 *
 * Aucune mesure ici : chaque panneau porte la sienne, et le fond va d'un bord à
 * l'autre. Elle lit la session pour ne pas proposer « Se connecter » à
 * quelqu'un de connecté ; le prix est que les pages légales ne sont plus
 * statiques.
 */
/**
 * Chaque page publique désigne sa version dans l'autre langue, et celles de
 * `/en` leur carte de partage anglaise. Un `openGraph` posé ici remplace celui
 * de la racine en entier, image comprise : il reprend donc ce qu'elle y mettait.
 */
export async function generateMetadata(): Promise<Metadata> {
  const enTetes = await headers();
  const chemin = enTetes.get(EN_TETE_DU_CHEMIN);
  const alternates = chemin ? { languages: versionsDeLaPage(chemin) } : undefined;

  if (langueDepuisCode(enTetes.get(EN_TETE_DE_LANGUE)) !== "EN") return { alternates };

  const t = await getTranslations("racine");
  const image = { url: "/partage/en", ...TAILLE_DE_PARTAGE, alt: MESSAGES.EN.site.partage.alt };

  return {
    alternates,
    openGraph: {
      type: "website",
      siteName: "Kairn",
      title: "Kairn",
      description: t("description"),
      locale: t("localeOpenGraph"),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: "Kairn",
      description: t("description"),
      images: [image.url],
    },
  };
}

export default async function CoquilleSite({ children }: { children: React.ReactNode }) {
  const utilisateur = await getCurrentUser();
  const t = await getTranslations("site.accueil.entete");

  return (
    <div className="bg-surface-papier flex min-h-dvh flex-col">
      {/* L'en-tête porte le grain comme les panneaux : sans lui, il paraît
          plus clair que le hero de même teinte, et la couture se voit. */}
      <header className="entete-du-site grain relative z-20">
        {/* La même mesure et les mêmes gouttières que la mesure « page » d'un
            Panneau, pour que la marque s'aligne sur le titre qu'elle surplombe.
            La hauteur (`h-20`) est recopiée dans la hauteur d'ouverture du hero,
            qui se mesure au pli moins l'en-tête : les deux se changent ensemble. */}
        <div className="px-pas-6 md:px-pas-8 relative z-10 mx-auto flex h-20 w-full max-w-6xl items-center justify-between 2xl:max-w-[84rem]">
          <Link href={ROUTES.accueil} className="rounded-galet">
            <Marque taille={30} />
          </Link>
          <Link
            href={utilisateur ? ROUTES.aujourdhui : ROUTES.connexion}
            className="text-h2-app rounded-galet px-pas-6 py-pas-3 hover:bg-surface-ombre text-stone-500 transition-colors hover:text-stone-900"
          >
            {utilisateur ? t("aujourdhui") : t("seConnecter")}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
