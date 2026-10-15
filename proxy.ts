import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { PARAMETRE_DE_SUITE, ROUTES } from "@/lib/auth/routes";
import { langueDepuisCode, langueDevinee } from "@/lib/domain/langue-devinee";
import { adressePublique, EN_TETE_DU_CHEMIN, estPagePublique } from "@/lib/i18n/adresses";
import { COOKIE_DE_LANGUE, EN_TETE_DE_LANGUE, LOCALE } from "@/lib/i18n/langues";
import type { Langue } from "@/lib/db/types";

/**
 * Deux barrages, l'un après l'autre.
 *
 * La langue des pages publiques. `/en/…` est réécrit vers la page unique, la
 * langue posée en en-tête et retenue en cookie ; `/fr/…` retient le français et
 * renvoie à l'adresse sans préfixe. Sans préfixe ni choix, `langueDevinee`
 * oriente selon le navigateur — sauf pour un compte connecté, dont la langue
 * n'est pas lisible ici : on ne le bascule pas en anglais sur la foi du
 * navigateur.
 *
 * L'entrée du groupe authentifié ne regarde que la présence du cookie de
 * session, pour ne pas afficher une coquille vide. La vérification qui fait
 * foi est côté serveur, dans les pages et les route handlers.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const lienCourt = LIENS_COURTS[pathname];

  if (lienCourt) return servirUnLienCourt(request, lienCourt);

  const prefixe = /^\/(en|fr)(\/.*)?$/.exec(pathname);

  if (prefixe) return servirLaLangue(request, prefixe[1] === "en" ? "EN" : "FR", prefixe[2] ?? "/");

  if (estPagePublique(pathname)) return orienter(request);

  if (getSessionCookie(request)) return NextResponse.next();

  const destination = new URL(ROUTES.connexion, request.url);
  destination.searchParams.set(PARAMETRE_DE_SUITE, pathname);

  return NextResponse.redirect(destination);
}

/**
 * Les liens courts des bios TikTok, un par compte. Ils servent l'accueil sans
 * changer d'adresse : l'onglet Pages de Vercel Analytics compte ainsi les
 * visites de chaque bio sur le plan gratuit, où les paramètres UTM ne se
 * lisent pas.
 */
const LIENS_COURTS: Record<string, Langue> = { "/tt": "FR", "/en/tt": "EN" };

function servirUnLienCourt(request: NextRequest, langue: Langue): NextResponse {
  const reponse = NextResponse.rewrite(
    versLaPage(request, "/"),
    avecLaLangue(request, langue, "/"),
  );

  // Le compte anglais retient l'anglais, comme `/en` ; le français ne pose rien.
  return langue === "EN" ? retenir(reponse, langue) : reponse;
}

/** Le choix retenu un an, pour les pages qu'on visite sans compte. */
function retenir(reponse: NextResponse, langue: Langue): NextResponse {
  reponse.cookies.set(COOKIE_DE_LANGUE, LOCALE[langue], {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return reponse;
}

function versLaPage(request: NextRequest, chemin: string): URL {
  const url = request.nextUrl.clone();
  url.pathname = chemin;

  return url;
}

function avecLaLangue(
  request: NextRequest,
  langue: Langue,
  chemin: string,
): { request: { headers: Headers } } {
  const enTetes = new Headers(request.headers);
  enTetes.set(EN_TETE_DE_LANGUE, LOCALE[langue]);
  // La page sans préfixe, pour que ses métadonnées désignent ses deux versions.
  enTetes.set(EN_TETE_DU_CHEMIN, chemin);

  return { request: { headers: enTetes } };
}

function servirLaLangue(request: NextRequest, langue: Langue, reste: string): NextResponse {
  // Le français n'a pas d'adresse préfixée, et une page de l'application n'en a
  // dans aucune langue : on retient le choix, puis on renvoie à la vraie adresse.
  if (langue === "FR" || !estPagePublique(reste)) {
    return retenir(NextResponse.redirect(versLaPage(request, reste)), langue);
  }

  return retenir(
    NextResponse.rewrite(versLaPage(request, reste), avecLaLangue(request, langue, reste)),
    langue,
  );
}

function orienter(request: NextRequest): NextResponse {
  const choix = request.cookies.get(COOKIE_DE_LANGUE)?.value;
  const connecte = Boolean(getSessionCookie(request));
  const langue =
    connecte && !langueDepuisCode(choix)
      ? "FR"
      : langueDevinee({ choix, acceptLanguage: request.headers.get("accept-language") });

  if (langue === "EN") {
    return NextResponse.redirect(
      versLaPage(request, adressePublique(request.nextUrl.pathname, "EN")),
    );
  }

  return NextResponse.next(avecLaLangue(request, "FR", request.nextUrl.pathname));
}

export const config = {
  matcher: [
    "/",
    "/tt",
    "/en",
    "/en/:path*",
    "/fr",
    "/fr/:path*",
    "/tarifs",
    "/confidentialite",
    "/mentions-legales",
    "/desinscription",
    "/aujourdhui/:path*",
    "/depots/:path*",
    "/reglages/:path*",
    "/comment-ca-marche/:path*",
    "/admin/:path*",
    "/signalements/:path*",
  ],
};
