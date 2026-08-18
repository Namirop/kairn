/**
 * L'origine publique du site, en absolu.
 *
 * Deux endroits en ont besoin et ne peuvent pas s'en passer : les métadonnées,
 * qui annoncent l'image de partage, et le manifeste, qui doit se désigner
 * lui-même par une URL entière pour que le navigateur reconnaisse l'application
 * déjà installée. Recopier la constante à deux endroits, c'est accepter qu'elle
 * diverge le jour où le domaine change — et le symptôme serait muet des deux
 * côtés.
 *
 * En préproduction, l'origine du déploiement courant : l'aperçu d'une branche
 * montre la branche.
 */
export const ORIGINE_DU_SITE =
  process.env.VERCEL_ENV === "production" || !process.env.VERCEL_URL
    ? "https://kairn.me"
    : `https://${process.env.VERCEL_URL}`;
