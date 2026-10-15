import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/** La langue de chaque requête et ses textes : voir `lib/i18n/requete.ts`. */
const avecLesLangues = createNextIntlPlugin("./lib/i18n/requete.ts");

const nextConfig: NextConfig = {
  /**
   * Next plafonne par défaut le corps d'une action à 1 Mo, ce qui fait échouer
   * en 500 muet une capture de téléphone. 4,5 Mo est la borne d'une fonction
   * Vercel, au-delà de laquelle rien ne passe ; ce qui protège vraiment, c'est
   * `reduireLaCapture`, qui réduit l'image dans le navigateur avant l'envoi.
   */
  experimental: {
    serverActions: { bodySizeLimit: "4.5mb" },
  },

  /**
   * `sharp` cherche son binaire dans `@img/sharp-<plateforme>`, un nom composé
   * à l'exécution que le traceur ne voit pas : sans cette ligne, la fonction de
   * `/depots/nouveau` meurt en ligne (« Could not load the sharp module using
   * the linux-x64 runtime »). Le motif ne ramène que le binaire présent sur la
   * machine de build.
   */
  outputFileTracingIncludes: {
    "/depots/**": ["./node_modules/@img/**"],
  },

  /**
   * Pendant les captures d'assets (`ASSETS_PREVIEW=1`), l'indicateur de dev de
   * Next est éteint : sa pastille se retrouverait dans chaque capture.
   */
  ...(process.env.ASSETS_PREVIEW === "1" ? { devIndicators: false as const } : {}),

  poweredByHeader: false,

  /**
   * Les protections que le navigateur applique sans rien casser. Le cadre reste
   * permis à la même origine : la vérification en largeur mobile charge la page
   * dans une iframe d'elle-même. Pas de CSP de scripts : Next injecte des
   * scripts en ligne, et la tenir demanderait un nonce par requête.
   */
  async headers() {
    return [
      {
        source: "/:chemin*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default avecLesLangues(nextConfig);
