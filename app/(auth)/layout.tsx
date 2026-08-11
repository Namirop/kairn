import Link from "next/link";
import { Marque } from "@/components/coquille/marque";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Coquille des écrans d'entrée.
 *
 * Le formulaire est posé sur une surface de papier, au milieu d'un fond
 * d'ombre : c'est le contraste de surface qui le tient, pas une bordure ni une
 * colonne perdue dans du blanc.
 */
export default function CoquilleAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-ombre grain px-pas-4 py-pas-8 md:px-pas-8 relative flex min-h-dvh w-full flex-col">
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <Link href={ROUTES.accueil} className="rounded-galet self-start">
          <Marque />
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="p-pas-8 md:p-pas-12 rounded-carte bg-surface-papier my-pas-12 w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
