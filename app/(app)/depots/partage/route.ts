import { NextResponse } from "next/server";

/**
 * Repli quand le service worker n'a pas pris le partage (premier lancement,
 * mise à jour en bascule) ; sans elle, un 405. Le corps n'est pas lu : le reste
 * du chemin garde le partage sur l'appareil. Renvoi relatif à la requête, pour
 * qu'un aperçu de branche reste sur sa branche.
 */
export function POST(requete: Request): Response {
  return NextResponse.redirect(new URL("/depots/nouveau?partage=absent", requete.url), 303);
}

/** La connexion ramène ici en GET (un renvoi ne rejoue pas un POST) : sans lui, un 405. */
export function GET(requete: Request): Response {
  return NextResponse.redirect(new URL("/depots/nouveau?partage=absent", requete.url), 303);
}
