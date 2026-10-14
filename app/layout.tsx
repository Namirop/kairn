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

  // Il faut déclarer les deux : dès qu'`icons` existe, il remplace la détection
  // de fichier (`app/icon.png`) au lieu de s'y ajouter, et l'onglet retomberait
  // sur `/favicon.ico`, qui n'existe pas.
  icons: {
    icon: { url: "/icon.png", type: "image/png" },
    apple: "/icones/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Kairn", statusBarStyle: "default" },
  formatDetection: { telephone: false },

  // L'image vient d'`app/opengraph-image.tsx`, que Next ajoute lui-même.
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
        {/* Sans cookie ni identifiant entre sites : c'est ce qui dispense de
            bandeau, et la page « Confidentialité » le dit. Une mesure qui
            perdrait ces propriétés changerait d'abord cette page. À la racine,
            pour suivre le passage de la landing à l'application. */}
        <Analytics />
      </body>
    </html>
  );
}
