import { timingSafeEqual } from "node:crypto";

/**
 * Les routes cron sont publiques par nature : elles doivent s'authentifier
 * autrement que par une session. Le déclencheur envoie `CRON_SECRET` en
 * `Authorization: Bearer`, comparé en temps constant.
 */
function egales(a: string, b: string): boolean {
  const gauche = Buffer.from(a);
  const droite = Buffer.from(b);

  if (gauche.length !== droite.length) return false;

  return timingSafeEqual(gauche, droite);
}

export function estUnCronAutorise(requete: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("CRON_SECRET est absent : toute route cron est refusée.");
    return false;
  }

  const entete = requete.headers.get("authorization");

  return entete !== null && egales(entete, `Bearer ${secret}`);
}
