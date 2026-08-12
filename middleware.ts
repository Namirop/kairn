import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { RETURN_TO_PARAM, ROUTES } from "@/lib/auth/routes";

/**
 * Barrage d'entrée du groupe authentifié. Il ne regarde que la présence du
 * cookie de session : la vérification qui fait foi se fait côté serveur, dans
 * les pages et les route handlers. Ce test-ci évite d'afficher une coquille
 * vide à quelqu'un qui n'est pas connecté du tout.
 */
export function middleware(request: NextRequest) {
  if (getSessionCookie(request)) {
    return NextResponse.next();
  }

  const destination = new URL(ROUTES.connexion, request.url);
  destination.searchParams.set(RETURN_TO_PARAM, request.nextUrl.pathname);

  return NextResponse.redirect(destination);
}

export const config = {
  matcher: [
    "/aujourdhui/:path*",
    "/depots/:path*",
    "/reglages/:path*",
    "/comment-ca-marche/:path*",
    "/signalements/:path*",
  ],
};
