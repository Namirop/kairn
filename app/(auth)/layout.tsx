import Link from "next/link";
import { Marque } from "@/components/coquille/marque";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Coquille des écrans d'entrée.
 *
 * Sur téléphone, le rythme descend d'un cran pour que tout tienne sans
 * défilement ; les écarts de bureau reviennent dès `md`. La marque est centrée
 * au-dessus de la carte et non en coin : l'écran n'a pas d'en-tête
 * d'application. Elle ramène à la page publique.
 */
export default function CoquilleAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-ombre grain px-pas-4 py-pas-4 md:px-pas-8 md:py-pas-8 relative flex min-h-dvh w-full flex-col">
      <div className="gap-pas-4 md:gap-pas-8 relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center">
        <Link href={ROUTES.accueil} className="rounded-galet">
          <Marque taille={40} />
        </Link>

        {/* La carte prend le `max-w-lg` du conteneur : plus étroite, « Entrer
            dans Kairn » se casserait sur deux lignes. */}
        <div className="p-pas-6 md:p-pas-12 rounded-carte bg-surface-papier w-full">{children}</div>
      </div>
    </div>
  );
}
