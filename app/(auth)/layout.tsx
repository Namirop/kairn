import Link from "next/link";
import { Marque } from "@/components/coquille/marque";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Coquille des écrans d'entrée. Colonne étroite, alignée à gauche : un
 * formulaire centré au milieu du vide n'aide personne à le remplir.
 */
export default function CoquilleAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-pas-4 py-pas-8 md:px-pas-8 mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
      <Link href={ROUTES.accueil} className="self-start rounded-xs">
        <Marque />
      </Link>
      <div className="flex flex-1 items-center justify-center">
        <div className="py-pas-12 w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
