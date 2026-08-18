import type { Metadata, Viewport } from "next";
import { RegistreServiceWorker } from "@/components/pwa/registre-service-worker";
import { PAPIER } from "@/lib/design/couleurs-hors-css";
import { ORIGINE_DU_SITE } from "@/lib/site/origine";
import { classesPolices } from "./fonts";
import "./globals.css";

const DESCRIPTION =
  "Dépose ce que tu apprends. Kairn le découpe en concepts et te les repose au bon moment.";

export const metadata: Metadata = {
  metadataBase: new URL(ORIGINE_DU_SITE),
  title: { default: "Kairn", template: "%s · Kairn" },
  description: DESCRIPTION,
  applicationName: "Kairn",
  manifest: "/manifest.webmanifest",

  // La favicon vient d'`app/icon.png`, que Next détecte. La pastille iOS, elle,
  // vit dans `public/` et n'était déclarée nulle part : le fichier existait
  // depuis le début et aucun appareil n'allait le chercher.
  icons: { apple: "/icones/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Kairn", statusBarStyle: "default" },
  formatDetection: { telephone: false },

  // L'image elle-même vient d'`app/opengraph-image.tsx` : Next l'ajoute et pose
  // son URL absolue et ses dimensions. On ne décrit ici que ce qu'il ne devine
  // pas.
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Kairn",
    title: "Kairn",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kairn",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: PAPIER,
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={classesPolices}>
        {children}
        <RegistreServiceWorker />
      </body>
    </html>
  );
}
