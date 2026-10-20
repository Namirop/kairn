import { Panneau } from "@/components/coquille/panneau";
import { EssaiDeDepot } from "@/components/site/essai-de-depot";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * Le panneau d'essai : la surface et l'ancre, la grille vivant dans
 * `FormulaireDEssai` et `EssaiRepris`. Pas de lien de connexion : il ouvrirait
 * une sortie juste sous le geste qu'on veut provoquer.
 */
export function Essai({
  invite,
  essaiPrecedent,
}: {
  invite: string;
  essaiPrecedent: AvancementDeLEssai | null;
}) {
  return (
    <Panneau id="depot" surface="papier" aere>
      <EssaiDeDepot invite={invite} essaiPrecedent={essaiPrecedent} />
    </Panneau>
  );
}
