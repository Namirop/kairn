import { redirect } from "next/navigation";
import { AccordFuseau } from "@/components/compte/accord-fuseau";
import { BarreBasse } from "@/components/coquille/barre-basse";
import { EnTete } from "@/components/coquille/en-tete";
import { Rail } from "@/components/coquille/rail";
import { InviteInstallation } from "@/components/pwa/invite-installation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";

/**
 * La coquille de l'application authentifiée.
 *
 * Le middleware a déjà écarté les visiteurs sans cookie ; ici on vérifie la
 * session pour de bon. Une session expirée renvoie vers la connexion plutôt que
 * vers un écran d'erreur : la personne n'a rien fait de mal.
 */
export default async function CoquilleApplication({ children }: { children: React.ReactNode }) {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const fuseau = await lireFuseauUtilisateur(utilisateur.id);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-surface-papier min-h-dvh">
        <Rail />
        <div className="md:pl-28">
          <EnTete utilisateur={utilisateur} />
          {/* Aucune mesure ici, et aucun rembourrage : chaque écran est une
              pile de panneaux qui porte les siens. Un conteneur à cet endroit
              empêcherait un fond d'aller d'un bord à l'autre, et une marge
              basse posée ici se peindrait de la couleur de la coquille, sous
              le dernier panneau — la bande d'une autre couleur, encore elle. */}
          <main>{children}</main>
        </div>
        <BarreBasse />
        <InviteInstallation />
        <AccordFuseau enregistre={fuseau} />
      </div>
    </TooltipProvider>
  );
}
