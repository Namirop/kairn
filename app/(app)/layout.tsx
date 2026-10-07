import { redirect } from "next/navigation";
import { AccordFuseau } from "@/components/compte/accord-fuseau";
import { BarreBasse } from "@/components/coquille/barre-basse";
import { ChoixDePalette } from "@/components/site/choix-de-palette";
import { EnTete } from "@/components/coquille/en-tete";
import { Rail } from "@/components/coquille/rail";
import { TooltipProvider } from "@/components/ui/tooltip";
import { estAdministrateur } from "@/lib/auth/admin";
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

  // La navigation d'un administrateur n'est pas celle des autres : « Admin »
  // prend la place de « Réglages », qui repasse dans le rail interne. C'est un
  // raccourci et rien d'autre — l'accès, lui, est gardé page par page, côté
  // serveur, sur l'adresse vérifiée de la session.
  const administrateur = estAdministrateur(utilisateur.email);

  return (
    <TooltipProvider delayDuration={200}>
      {/* La hauteur descend par le flux, elle ne se calcule pas.

          La pile de panneaux d'un écran soustrayait la hauteur de l'en-tête à
          celle de la fenêtre, en dur, deux fois — une valeur pour le téléphone,
          une pour le bureau. Ça tenait tant que l'en-tête était là partout ; le
          jour où un écran s'en passe, la pile s'arrête trop tôt et laisse sous
          elle une bande de la couleur de la coquille. Une colonne flexible dit
          la même chose sans chiffre : ce qui reste après l'en-tête, quel qu'il
          soit, et rien si l'en-tête n'est pas là. */}
      <div className="bg-surface-papier flex min-h-dvh flex-col">
        <Rail administrateur={administrateur} />
        {/* Le décalage du rail vit ici, et la règle de passage le reprend à
            zéro quand le rail s'efface — voir `globals.css`. */}
        <div data-colonne className="flex flex-1 flex-col md:pl-28">
          <EnTete />
          {/* Aucune mesure ici, et aucun rembourrage : chaque écran est une
              pile de panneaux qui porte les siens. Un conteneur à cet endroit
              empêcherait un fond d'aller d'un bord à l'autre, et une marge
              basse posée ici se peindrait de la couleur de la coquille, sous
              le dernier panneau — la bande d'une autre couleur, encore elle. */}
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
        <BarreBasse administrateur={administrateur} />
        <AccordFuseau enregistre={fuseau} />

        {/* Branche `couleur-peinte` seulement : le sélecteur des deux pistes,
            ici comme sur la page publique. Il part avec elles. */}
        <ChoixDePalette />
      </div>
    </TooltipProvider>
  );
}
