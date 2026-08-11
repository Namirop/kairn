import type { Metadata, Viewport } from "next";
import { PAPIER } from "@/lib/design/couleurs-hors-css";
import { classesPolices } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kairn", template: "%s · Kairn" },
  description:
    "Dépose ce que tu apprends. Kairn le découpe en concepts et te les repose au bon moment.",
  applicationName: "Kairn",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Kairn", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: PAPIER,
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={classesPolices}>{children}</body>
    </html>
  );
}
