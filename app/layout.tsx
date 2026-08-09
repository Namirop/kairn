import type { Metadata, Viewport } from "next";
import { classesPolices } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Cairn", template: "%s · Cairn" },
  description:
    "Dépose ce que tu apprends. Cairn le découpe en concepts et te les repose au bon moment.",
  applicationName: "Cairn",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Cairn", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#e9e9e5",
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
