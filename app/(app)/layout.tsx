import { redirect } from "next/navigation";
import { AccordFuseau } from "@/components/compte/accord-fuseau";
import { BarreBasse } from "@/components/coquille/barre-basse";
import { EnTete } from "@/components/coquille/en-tete";
import { Rail } from "@/components/coquille/rail";
import { TooltipProvider } from "@/components/ui/tooltip";
import { estAdministrateur } from "@/lib/auth/admin";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import { lireFuseauUtilisateur } from "@/lib/db/reglages-du-compte";

/** `proxy.ts` n'a regardé que le cookie ; ici la session est vérifiée pour de bon. */
export default async function CoquilleApplication({ children }: { children: React.ReactNode }) {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);

  const fuseau = await lireFuseauUtilisateur(utilisateur.id);

  // Un raccourci de navigation seulement : l'accès admin est gardé page par page.
  const administrateur = estAdministrateur(utilisateur.email);

  return (
    <TooltipProvider delayDuration={200}>
      {/* Hauteur par le flux, sans soustraire l'en-tête : la session s'en passe
          et doit remplir la fenêtre. */}
      <div className="bg-surface-papier flex min-h-dvh flex-col">
        <Rail administrateur={administrateur} />
        {/* Remis à zéro quand le rail s'efface : voir `app/styles/coquille.css`. */}
        <div data-colonne className="md:pl-rail flex flex-1 flex-col">
          <EnTete />
          {/* Ni mesure ni rembourrage : chaque panneau porte les siens. */}
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
        <BarreBasse administrateur={administrateur} />
        <AccordFuseau enregistre={fuseau} />
      </div>
    </TooltipProvider>
  );
}
