import { NextResponse } from "next/server";

/**
 * Le repli du partage du système, quand le service worker n'a pas pris l'envoi
 * (premier lancement après installation, mise à jour en cours de bascule).
 * Sans elle, ce partage finirait sur un 405.
 *
 * Le corps n'est volontairement pas lu : le stocker reviendrait à écrire côté
 * serveur ce que le reste du chemin garde sur l'appareil. Le formulaire dit que
 * le partage n'est pas arrivé.
 *
 * L'adresse de renvoi part de celle de la requête, pour qu'un aperçu de branche
 * reste sur sa branche.
 */
export function POST(requete: Request): Response {
  return NextResponse.redirect(new URL("/depots/nouveau?partage=absent", requete.url), 303);
}

/**
 * La même adresse en lecture. Un partage sans session passe par la connexion,
 * qui ramène ensuite ici en GET (un renvoi ne rejoue pas un POST) : sans ce
 * handler, la connexion finirait sur un 405. Le partage est perdu, le
 * formulaire le dit.
 */
export function GET(requete: Request): Response {
  return NextResponse.redirect(new URL("/depots/nouveau?partage=absent", requete.url), 303);
}
