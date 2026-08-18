import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;
