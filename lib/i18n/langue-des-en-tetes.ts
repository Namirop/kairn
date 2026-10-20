import { parseCookies } from "better-auth/cookies";
import type { Langue } from "@/lib/db/types";
import { langueDevinee } from "@/lib/domain/langue-devinee";
import { COOKIE_DE_LANGUE } from "./langues";

/**
 * Sans compte : le cookie, puis le navigateur, puis le français. Pour ce qui
 * tient des en-têtes sans être un rendu (envoi du code, création du compte) ;
 * un rendu passe par `langueDeLaRequete`, qui lit aussi l'adresse et le compte.
 */
export function langueDesEnTetes(entetes: Headers | null | undefined): Langue {
  return langueDevinee({
    choix: parseCookies(entetes?.get("cookie") ?? "").get(COOKIE_DE_LANGUE),
    acceptLanguage: entetes?.get("accept-language"),
  });
}
