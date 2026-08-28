import { Panneau } from "@/components/coquille/panneau";
import { EssaiDeDepot } from "@/components/site/essai-de-depot";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * Le panneau d'essai : ce qui vivait sous le titre du hero, désormais dans sa
 * propre bande.
 *
 * **Sa composition dépend de ce qu'il a à montrer, et c'est le seul panneau de
 * la page dans ce cas.** Tant qu'il invite, il porte la charpente des deux
 * sections qui le suivent — titre à gauche, contenu à droite, même mesure, même
 * grille. Dès qu'il a un résultat, il prend la largeur entière : ce qu'il montre
 * alors est la preuve du produit, et elle ne tient pas dans une demi-page
 * pendant que l'autre moitié garde un titre et du vide.
 *
 * La grille est donc descendue dans le composant qui décide de l'état, et le
 * panneau ne garde que ce qui ne change pas : la surface, le rythme, l'ancre.
 *
 * Ce qui le distingue de ses voisins vient de là où le système le prévoit : la
 * surface et le contenu. C'est le seul des trois qui porte un champ et un bouton
 * plein — la fonction se signale toute seule, elle n'a pas besoin d'une grille à
 * part.
 *
 * **Il n'y a pas de rappel de connexion.** L'en-tête de la page publique porte
 * déjà « Se connecter », et le répéter au pied de l'essai ajoutait une porte de
 * sortie juste sous le geste qu'on cherche à provoquer.
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
