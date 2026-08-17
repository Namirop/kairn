import { PileDeSession } from "@/components/revision/pile-de-session";
import { ETIQUETTE_RAIL, RailDeScene } from "@/components/revision/rail-de-scene";

/**
 * Où en est un tour d'entraînement.
 *
 * Le même rail que la session, et volontairement plus pauvre : ni série ni
 * échéance, parce qu'un tour ne touche à rien de tout ça. Ce qu'il dit à la
 * place, c'est justement qu'il ne touche à rien — la ligne vivait sous la carte,
 * où elle flottait sans propriétaire ; ici elle est à sa place, dans la surface
 * qui parle du cadre.
 *
 * Aucun compte à l'écran : « 3 / 12 » transformerait en devoir ce qu'on fait
 * parce qu'on peut s'arrêter quand on veut. La pile suffit à dire qu'on avance —
 * et le compte reste dit au lecteur d'écran, à qui la pile ne dit rien.
 */
export function EtatDentrainement({ faites, total }: { faites: number; total: number }) {
  return (
    <RailDeScene>
      <p className={`${ETIQUETTE_RAIL} order-1`}>Entraînement</p>

      {/* En bande, la pile n'aurait pas la hauteur d'un empilement, et il n'y a
          pas de compte pour la remplacer : le tour se contente alors de dire ce
          qu'il est. */}
      <div className="order-2 hidden lg:block">
        <PileDeSession
          rang={faites}
          total={total}
          clair
          graine="entrainement"
          intitule={`Question ${Math.min(faites + 1, total)} sur ${total}`}
        />
      </div>

      <p className="text-petit order-3 w-full text-stone-300 lg:w-auto">
        Ça ne change pas ton planning.
      </p>
    </RailDeScene>
  );
}
