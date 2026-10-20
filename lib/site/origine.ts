/**
 * Absolue : le manifeste doit se désigner par une URL entière pour que le
 * navigateur reconnaisse l'app installée. En preview, l'aperçu montre la branche.
 */
export const ORIGINE_DU_SITE =
  process.env.VERCEL_ENV === "production" || !process.env.VERCEL_URL
    ? "https://kairn.me"
    : `https://${process.env.VERCEL_URL}`;
