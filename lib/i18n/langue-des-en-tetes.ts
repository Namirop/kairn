import { parseCookies } from "better-auth/cookies";
import type { Langue } from "@/lib/db/types";
import { langueDevinee } from "@/lib/domain/langue-devinee";
import { COOKIE_DE_LANGUE } from "./langues";

/**
 * La langue de quelqu'un qui n'a pas encore de compte, lue sur sa requête :
 * le choix retenu en cookie, à défaut son navigateur, à défaut le français.
 *
 * Pour les endroits qui tiennent des en-têtes sans être un rendu — l'envoi du
 * code de connexion, la création du compte. Un rendu passe par
 * `langueDeLaRequete`, qui sait aussi lire l'adresse et le compte.
 */
export function langueDesEnTetes(entetes: Headers | null | undefined): Langue {
  return langueDevinee({
    choix: parseCookies(entetes?.get("cookie") ?? "").get(COOKIE_DE_LANGUE),
    acceptLanguage: entetes?.get("accept-language"),
  });
}
