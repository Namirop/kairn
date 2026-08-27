"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES, ROUTES_DE_PASSAGE } from "@/lib/auth/routes";
import type { SessionUser } from "@/lib/auth/session";
import { Marque } from "./marque";

/** Initiales du compte, repère discret plutôt qu'un avatar générique. */
function initiales(nom: string, email: string): string {
  const source = nom.trim() || email;
  const morceaux = source.split(/[\s@._-]+/).filter(Boolean);
  return (morceaux[0]?.[0] ?? "?").concat(morceaux[1]?.[0] ?? "").toUpperCase();
}

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
 * La pastille des initiales échange sa surface au passage : posée en papier sur
 * du papier, elle aurait disparu.
 *
 * **Il s'efface sur téléphone pendant un passage de questions.** Voir
 * `ROUTES_DE_PASSAGE` pour la raison. Il s'efface plutôt qu'il ne disparaît :
 * la coquille reste la même d'un écran à l'autre, et la hauteur qu'il libère
 * revient d'elle-même à la pile, qui la prend du flux.
 */
export function EnTete({ utilisateur }: { utilisateur: SessionUser }) {
  const chemin = usePathname();
  const passage = ROUTES_DE_PASSAGE.some(
    (route) => chemin === route || chemin.startsWith(`${route}/`),
  );

  return (
    <header
      className={`px-pas-4 md:px-pas-8 bg-surface-papier/85 sticky top-0 z-20 flex h-14 items-center justify-between backdrop-blur-sm md:h-16 ${
        passage ? "max-md:hidden" : ""
      }`}
    >
      <Link href={ROUTES.aujourdhui} className="rounded-galet">
        <Marque />
      </Link>
      <Link
        href={ROUTES.reglages}
        className="text-mono bg-surface-ombre hover:bg-surface-ombre/60 rounded-galet flex size-9 items-center justify-center font-mono tracking-[0.06em] text-stone-500 transition-colors hover:text-stone-900"
        aria-label={`Compte de ${utilisateur.name || utilisateur.email}`}
      >
        {initiales(utilisateur.name, utilisateur.email)}
      </Link>
    </header>
  );
}
