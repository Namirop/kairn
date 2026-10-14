/**
 * L'origine publique du site, en absolu, pour les métadonnées (l'image de
 * partage) et le manifeste, qui doit se désigner par une URL entière pour que
 * le navigateur reconnaisse l'application installée.
 *
 * En préproduction, l'origine du déploiement courant : l'aperçu d'une branche
 * montre la branche.
 */
export const ORIGINE_DU_SITE =
  process.env.VERCEL_ENV === "production" || !process.env.VERCEL_URL
    ? "https://kairn.me"
    : `https://${process.env.VERCEL_URL}`;
