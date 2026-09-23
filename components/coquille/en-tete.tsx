"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES, ROUTES_DE_PASSAGE } from "@/lib/auth/routes";
import { Marque } from "./marque";

/** Le symbole y est plus haut que son défaut : c'est la seule chose qu'il porte. */
const TAILLE_DE_LA_MARQUE = 32;

/**
 * L'en-tête porte la surface du panneau qu'il coiffe, et non la sienne.
 *
 * Il était en ombre au-dessus d'écrans qui ouvrent tous sur du papier : une
 * bande d'un gris à peine plus soutenu barrait le haut de chaque page, sans rien
 * séparer que le vide au-dessus du titre. Dans ce produit, un changement de
 * surface annonce un changement de sujet — l'en-tête n'en est pas un, il
 * accompagne. Il se confond donc avec la page jusqu'à la première coupe de
 * roche, qui est la vraie première séparation.
 *
 * **Il ne porte plus que la marque, et elle est au milieu.** La pastille des
 * initiales tenait la droite et menait aux réglages, qui sont déjà la troisième
 * entrée du rail sur le bureau et de la barre basse sur téléphone : deux portes
 * pour une pièce, dont l'une déguisée en identité. Sa disparition laisse un
 * en-tête qui ne fait qu'une chose — dire où l'on est —, et une marque au fer à
 * gauche dans une bande vide se lit comme un reste de gabarit. Centrée et montée
 * d'un tiers, elle devient ce qui coiffe l'écran.
 *
 * Un administrateur ne perd rien non plus : son rail de produit n'a jamais porté
 * les réglages — « Admin » y a pris leur place —, et il les retrouve dans le rail
 * interne sous « Mon compte ». Voir `DESTINATIONS_ADMIN`.
 *
 * **Il s'efface sur téléphone pendant un passage de questions.** Voir
 * `ROUTES_DE_PASSAGE` pour la raison. Il s'efface plutôt qu'il ne disparaît :
 * la coquille reste la même d'un écran à l'autre, et la hauteur qu'il libère
 * revient d'elle-même à la pile, qui la prend du flux.
 */
export function EnTete() {
  const chemin = usePathname();
  const passage = ROUTES_DE_PASSAGE.some(
    (route) => chemin === route || chemin.startsWith(`${route}/`),
  );

  return (
    <header
      className={`px-pas-4 md:px-pas-8 bg-surface-papier/85 sticky top-0 z-20 flex h-14 items-center justify-center backdrop-blur-sm md:h-16 ${
        passage ? "max-md:hidden" : ""
      }`}
    >
      <Link href={ROUTES.aujourdhui} className="rounded-galet">
        <Marque taille={TAILLE_DE_LA_MARQUE} />
      </Link>
    </header>
  );
}
