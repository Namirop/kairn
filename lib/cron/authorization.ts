import { timingSafeEqual } from "node:crypto";

/**
 * Les routes cron sont publiques par nature : elles doivent s'authentifier
 * autrement que par une session. Le déclencheur envoie `CRON_SECRET` en
 * `Authorization: Bearer`, comparé en temps constant.
 */
function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("CRON_SECRET est absent : toute route cron est refusée.");
    return false;
  }

  const header = request.headers.get("authorization");

  return header !== null && equals(header, `Bearer ${secret}`);
}
