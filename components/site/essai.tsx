import { Panneau } from "@/components/coquille/panneau";
import { EssaiDeDepot } from "@/components/site/essai-de-depot";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * Le panneau d'essai de la landing. Il ne porte que la surface et l'ancre : la
 * grille dépend de l'état et vit dans `FormulaireDEssai` et `EssaiRepris`.
 *
 * Pas de lien de connexion ici : l'en-tête le porte déjà, et le répéter ouvrirait
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
