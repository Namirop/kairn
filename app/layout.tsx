import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { RegistreServiceWorker } from "@/components/pwa/registre-service-worker";
import { PAPIER } from "@/lib/design/couleurs-hors-css";
import { ORIGINE_DU_SITE } from "@/lib/site/origine";
import { classesPolices } from "./fonts";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("racine");
  const description = t("description");

  return {
    ...METADONNEES,
    description,
    openGraph: { ...METADONNEES.openGraph, locale: t("localeOpenGraph"), description },
    twitter: { ...METADONNEES.twitter, description },
  };
}

const METADONNEES = {
  metadataBase: new URL(ORIGINE_DU_SITE),
  title: { default: "Kairn", template: "%s · Kairn" },
  applicationName: "Kairn",
  manifest: "/manifest.webmanifest",

  // Les deux icônes sont déclarées ici, et il faut les deux : dès qu'`icons`
  // existe, il **remplace** la détection de fichier au lieu de s'y ajouter. Ne
  // déclarer que la pastille iOS suffisait donc à retirer la favicon du HTML —
  // `app/icon.png` restait servi, mais plus personne ne pointait dessus, et
  // l'onglet retombait sur `/favicon.ico`, qui n'existe pas.
  icons: {
    icon: { url: "/icon.png", type: "image/png" },
    apple: "/icones/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Kairn", statusBarStyle: "default" },
  formatDetection: { telephone: false },

  // L'image elle-même vient d'`app/opengraph-image.tsx` : Next l'ajoute et pose
  // son URL absolue et ses dimensions. On ne décrit ici que ce qu'il ne devine
  // pas.
  openGraph: {
    type: "website",
    siteName: "Kairn",
    title: "Kairn",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kairn",
  },
} satisfies Metadata;

export const viewport: Viewport = {
  themeColor: PAPIER,
  colorScheme: "light",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={await getLocale()}>
      <body className={classesPolices}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <RegistreServiceWorker />
        {/* La mesure d'audience de Vercel : combien de visites, sur quelles
            pages, d'où. Sans cookie et sans identifiant qui suive quelqu'un d'un
            site à l'autre — c'est la raison de ce choix-là plutôt qu'un autre,
            et c'est ce qui permet de ne pas poser de bandeau. La page
            « Confidentialité » le dit, et elle doit continuer de le dire.

            Posée à la racine pour couvrir la landing comme l'application : ce
            qu'on veut savoir, c'est où les gens s'arrêtent, et l'essentiel de
            cette réponse est dans le passage de l'une à l'autre. */}
        <Analytics />
      </body>
    </html>
  );
}
