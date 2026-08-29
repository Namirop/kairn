import Link from "next/link";
import { Marque } from "@/components/coquille/marque";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Coquille des écrans d'entrée.
 *
 * **Elle tient dans un écran de téléphone, et son rythme y descend d'un cran
 * pour ça.** Le formulaire, la porte Google et la mention de consentement font
 * une colonne qu'aucun défilement ne devrait servir : c'est le premier écran du
 * produit, et on n'y cherche rien — on y entre. Les rembourrages et les écarts
 * de bureau restent entiers dès `md`, où la place ne manque pas.
 *
 * Le formulaire est posé sur une surface de papier, au milieu d'un fond d'ombre :
 * c'est le contraste de surface qui le tient, pas une bordure ni une colonne
 * perdue dans du blanc.
 *
 * **La marque est au-dessus du formulaire, pas dans le coin.** Posée en haut à
 * gauche, elle tenait le rôle d'un en-tête d'application sur un écran qui n'en a
 * pas : rien ne la reliait à la carte qu'on regarde, et elle était le seul élément
 * d'un angle par ailleurs vide. Centrée juste au-dessus, elle dit sur quoi on
 * arrive — c'est le seul emploi qu'elle a ici. Elle reste le chemin du retour vers
 * la page publique.
 */
export default function CoquilleAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-ombre grain px-pas-4 py-pas-6 md:px-pas-8 md:py-pas-8 relative flex min-h-dvh w-full flex-col">
      <div className="gap-pas-6 md:gap-pas-8 relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center">
        <Link href={ROUTES.accueil} className="rounded-galet">
          <Marque taille={40} />
        </Link>

        {/* La carte est plus large qu'avant : « Entrer dans Kairn » se cassait en
            deux lignes dans trois cent quatre-vingts pixels, et un titre de page
            coupé au milieu d'un nom propre se lit deux fois. */}
        <div className="p-pas-6 md:p-pas-12 rounded-carte bg-surface-papier w-full">{children}</div>
      </div>
    </div>
  );
}
