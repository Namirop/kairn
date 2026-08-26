import { Panneau } from "@/components/coquille/panneau";
import { Apparition, Temps } from "@/components/site/apparition";
import { EssaiDeDepot } from "@/components/site/essai-de-depot";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * Le panneau d'essai : ce qui vivait sous le titre du hero, désormais dans sa
 * propre bande.
 *
 * **Il porte la même charpente que les deux sections qui le suivent** : titre à
 * gauche, contenu à droite, même mesure, même grille. Il en était le seul à
 * s'en écarter — colonne unique, mesure plus étroite —, ce qui ne le faisait
 * pas lire comme le panneau où l'on agit mais comme le panneau qui vient d'une
 * autre page. Trois bandes dont deux se ressemblent et une détonne ne font pas
 * un rythme, elles font une exception.
 *
 * Ce qui le distingue vient donc de là où le système le prévoit : la surface et
 * le contenu. C'est le seul des trois qui porte un champ et un bouton plein —
 * la fonction se signale toute seule, elle n'a pas besoin d'une grille à part.
 *
 * **Il n'y a plus de boîte.** Le champ n'a ni fond, ni bordure, ni contour au
 * repos : ce qu'on écrit se pose à même le papier. C'était déjà la direction du
 * système — « un sol, pas une boîte » — poussée jusqu'au bout.
 *
 * **Il n'y a pas non plus de rappel de connexion.** L'en-tête de la page
 * publique porte déjà « Se connecter », et le répéter au pied de l'essai
 * ajoutait une porte de sortie juste sous le geste qu'on cherche à provoquer.
 *
 * **Il ouvre sur le geste, pas sur l'invitation.** « Essaie » était un verbe
 * seul, sans objet : on lisait un encouragement là où il fallait une consigne,
 * et la question « essayer quoi ? » restait entière jusqu'au paragraphe
 * suivant. « Dépose quelque chose. » nomme l'acte avec le verbe contractuel du
 * produit — on dépose un Input —, ferme la phrase, et garde le registre bref de
 * l'ouverture, qui parle par constats ponctués.
 */
export function Essai({
  invite,
  essaiPrecedent,
}: {
  invite: string;
  essaiPrecedent: AvancementDeLEssai | null;
}) {
  return (
    <Panneau
      id="depot"
      surface="papier"
      aere
      className="gap-pas-8 md:gap-pas-12 grid md:grid-cols-[1fr_minmax(0,36rem)]"
    >
      <Apparition>
        <Temps>
          <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em]">
            Dépose
            <br />
            quelque chose.
          </h2>
        </Temps>
      </Apparition>

      <Apparition>
        <Temps>
          <p className="text-stone-500">
            Un article, une réponse qu&apos;on t&apos;a donnée, une page de manuel, ce qu&apos;un
            collègue vient de t&apos;expliquer. Kairn le découpe en concepts et te les repose juste
            avant que tu les oublies.
          </p>
        </Temps>

        <Temps className="mt-pas-6 md:mt-pas-8">
          <EssaiDeDepot invite={invite} essaiPrecedent={essaiPrecedent} />
        </Temps>
      </Apparition>
    </Panneau>
  );
}
