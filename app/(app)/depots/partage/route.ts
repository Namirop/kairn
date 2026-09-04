import { NextResponse } from "next/server";

/**
 * Le repli du partage du système, quand le service worker n'a pas pris l'envoi.
 *
 * C'est le worker qui reçoit ce que le manifeste déclare : il range ce qui a été
 * partagé sur l'appareil et renvoie au formulaire, sans que rien parte au
 * serveur. Cette route n'existe que pour la fenêtre où il n'est pas encore aux
 * commandes — le tout premier lancement après une installation, une mise à jour
 * en cours de bascule. Sans elle, ce partage-là finirait sur un 405.
 *
 * **Le corps n'est pas lu, et c'est délibéré.** Il n'y aurait rien à en faire :
 * un handler ne peut pas déposer sur l'appareil ce que le champ viendra
 * reprendre, et le stocker pour une seconde reviendrait à écrire côté serveur ce
 * que tout le reste du chemin s'applique à garder chez la personne. On renvoie
 * donc au formulaire en disant que le partage n'est pas arrivé, ce qui est vrai
 * et laisse le presse-papier faire le travail.
 *
 * L'adresse de renvoi se construit sur celle de la requête : en préproduction,
 * l'aperçu d'une branche doit rester sur la branche.
 */
export function POST(requete: Request): Response {
  return NextResponse.redirect(new URL("/depots/nouveau?partage=absent", requete.url), 303);
}

/**
 * La même adresse en lecture, qui n'arrive que par un détour.
 *
 * Un partage envoyé sans session ne passe pas par le worker : le middleware le
 * renvoie vers la connexion en mémorisant le chemin, et l'y ramène une fois la
 * session ouverte — en lecture cette fois, puisqu'un renvoi ne rejoue pas un
 * envoi. Sans ce handler, la personne finissait sa connexion sur un 405.
 *
 * Le partage, lui, a bien été perdu en route : le formulaire le dit.
 */
export function GET(requete: Request): Response {
  return NextResponse.redirect(new URL("/depots/nouveau?partage=absent", requete.url), 303);
}
