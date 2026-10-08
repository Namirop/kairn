import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/** La langue de chaque requête et ses textes : voir `lib/i18n/requete.ts`. */
const avecLesLangues = createNextIntlPlugin("./lib/i18n/requete.ts");

const nextConfig: NextConfig = {
  /**
   * Ce qu'une action de serveur a le droit de recevoir.
   *
   * **Next plafonne le corps d'une action à un mégaoctet, et personne ne l'écrit
   * nulle part.** Le dépôt par capture marchait depuis un ordinateur — une
   * capture d'écran de bureau pèse quelques centaines de kilooctets — et
   * échouait depuis un téléphone, où la même capture en pèse deux ou trois. Le
   * refus n'arrivait pas jusqu'à l'écran : `POST /depots/nouveau 500 — Body
   * exceeded 1 MB limit`, relevé dans les journaux du 13/09/2026, et le
   * formulaire restait planté sur son bouton.
   *
   * Quatre mégaoctets et demi, parce que c'est la borne de l'hébergeur : une
   * fonction Vercel refuse au-delà, quoi qu'on écrive ici. La valeur est donc
   * un plafond de sécurité et non une promesse — ce qui protège vraiment, c'est
   * `reduireLaCapture`, qui réduit l'image dans le navigateur avant l'envoi et
   * ramène une capture de téléphone à quelques centaines de kilooctets.
   */
  experimental: {
    serverActions: { bodySizeLimit: "4.5mb" },
  },

  /**
   * `sharp` est un paquet externe : il n'est pas empaqueté, il est `require`
   * à l'exécution, et il va alors chercher son binaire dans
   * `@img/sharp-<plateforme>`. Ce nom est composé au moment de l'appel — le
   * traceur qui décide quels fichiers montent dans la fonction déployée ne peut
   * pas le voir, et le binaire reste au sol. En ligne, la fonction qui sert
   * `/depots/nouveau` meurt à la première lecture de capture : « Could not load
   * the sharp module using the linux-x64 runtime ».
   *
   * On le nomme donc explicitement pour les routes qui déposent une image. Le
   * motif ne ramène que ce qui existe sur la machine de build : le binaire
   * win32 en local, le binaire linux-x64 chez l'hébergeur.
   */
  outputFileTracingIncludes: {
    "/depots/**": ["./node_modules/@img/**"],
  },
};

export default avecLesLangues(nextConfig);
