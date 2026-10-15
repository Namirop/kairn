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

/**
 * La coquille de l'application authentifiée. Le middleware n'a regardé que le
 * cookie ; ici on vérifie la session pour de bon, et une session expirée
 * renvoie vers la connexion.
 */
export default async function CoquilleApplication({ children }: { children: React.ReactNode }) {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);

  const fuseau = await lireFuseauUtilisateur(utilisateur.id);

  // Un raccourci de navigation, rien d'autre : l'accès admin est gardé page par
  // page, côté serveur, sur l'adresse vérifiée de la session.
  const administrateur = estAdministrateur(utilisateur.email);

  return (
    <TooltipProvider delayDuration={200}>
      {/* La hauteur descend par le flux, sans soustraire celle de l'en-tête :
          un écran peut s'en passer (la session), et la pile doit alors remplir
          la fenêtre. */}
      <div className="bg-surface-papier flex min-h-dvh flex-col">
        <Rail administrateur={administrateur} />
        {/* Le décalage du rail vit ici, et la règle de passage le reprend à
            zéro quand le rail s'efface — voir `app/styles/coquille.css`. */}
        <div data-colonne className="md:pl-rail flex flex-1 flex-col">
          <EnTete />
          {/* Ni mesure ni rembourrage : chaque écran est une pile de panneaux
              qui porte les siens, et leurs fonds vont d'un bord à l'autre. */}
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
        <BarreBasse administrateur={administrateur} />
        <AccordFuseau enregistre={fuseau} />
      </div>
    </TooltipProvider>
  );
}
