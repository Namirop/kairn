import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

/** Trois rôles, jamais plus. Satoshi n'est pas sur Google Fonts : voir app/fonts/README.md. */

export const policeDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--police-display",
  display: "swap",
});

export const policeDonnees = Geist_Mono({
  subsets: ["latin"],
  variable: "--police-donnees",
  display: "swap",
});

export const policeTexte = localFont({
  variable: "--police-texte",
  display: "swap",
  src: [
    { path: "./fonts/Satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Satoshi-700.woff2", weight: "700", style: "normal" },
  ],
});

export const classesPolices = [
  policeDisplay.variable,
  policeTexte.variable,
  policeDonnees.variable,
].join(" ");
