import { useTranslations } from "next-intl";
import { IndiceTactile, Infobulle } from "@/components/ui/infobulle";
import { avancementDuNiveau } from "@/lib/domain/progression";

/**
 * Ce que la progression vaut, sous le cairn.
 *
 * Trois lignes de la même taille tassées dans un coin disaient que rien de tout
 * ça n'avait d'importance — alors que c'est la seule récompense du produit : on
 * ne félicite jamais quelqu'un pour une bonne réponse, on lui montre ce qu'il a
 * construit. Une récompense qu'on chuchote ne récompense pas.
 *
 * Elle a donc quitté la colonne du cairn pour prendre toute la largeur du
 * panneau, en bande centrée sous les deux colonnes. Le panneau est le plus grand
 * de l'application et son tiers bas était vide ; c'est là que ces deux mesures
 * ont la place de compter, et le grand chiffre y devient lisible de loin.
 *
 * Deux mesures, deux traitements, parce qu'elles ne disent pas la même chose.
 * **La série** est un nombre qu'on regarde : grand chiffre, en display, et
 * l'ember — c'est la seule occurrence du produit, et elle est ici. **Le niveau**
 * est un chemin : il lui fallait sa part parcourue, parce que « Niveau 2 · 34 XP »
 * ne situe rien. La barre est en gris et jamais en accent : sur ce panneau, le
 * lichen appartient au sommet du cairn.
 *
 * Rien n'est mis en carte. Deux cartes côte à côte auraient posé des contenants
 * sur le seul panneau du produit qui n'en porte aucun.
 *
 * **Les deux explications s'ouvrent aussi au doigt depuis le 13/09/2026.** Elles
 * étaient dans des info-bulles, qui répondent à un survol et à rien d'autre :
 * sur un téléphone — c'est-à-dire là où ce produit s'installe — personne n'a
 * jamais pu lire ce qu'était une série ni d'où venait le niveau. Voir
 * `Infobulle`, qui bascule sur ce que l'appareil sait faire.
 */

const ETIQUETTE = "text-mono font-mono tracking-[0.14em] text-stone-400 uppercase";
const CHIFFRE = "font-display text-nombre mt-pas-2 leading-none font-medium tabular-nums";

function Serie({ streak }: { streak: number }) {
  const t = useTranslations("tableau.aujourdhui.progression");

  if (streak === 0) {
    // Centré comme les deux autres mesures. Au fer à gauche, cette phrase
    // partait au bord de l'écran pendant que le niveau se tenait au milieu du
    // sien : deux mesures qui se lisent ensemble s'éloignaient l'une de l'autre
    // au moment où l'une n'a pas encore de chiffre à opposer.
    return (
      <div className="text-center">
        <p className={ETIQUETTE}>{t("serie")}</p>
        <p className="mt-pas-3 text-corps text-stone-300">{t("serieVide")}</p>
      </div>
    );
  }

  return (
    <Infobulle className="rounded-galet block w-full text-center" contenu={t("serieAide")}>
      <p className={ETIQUETTE}>
        {t("serie")}
        <IndiceTactile />
      </p>
      <p className={`${CHIFFRE} text-ember-clair`}>{streak}</p>
      <p className="text-mono text-ember-clair mt-pas-2 font-mono tracking-[0.14em] uppercase">
        {t("serieUnite", { nombre: streak })}
      </p>
    </Infobulle>
  );
}

function Niveau({ xp }: { xp: number }) {
  const { niveau, part, restant } = avancementDuNiveau(xp);
  const t = useTranslations("tableau.aujourdhui.progression");

  return (
    <Infobulle className="rounded-galet block w-full text-center" contenu={t("niveauAide")}>
      <p className={ETIQUETTE}>
        {t("niveau")}
        <IndiceTactile />
      </p>
      <p className={CHIFFRE}>{niveau}</p>

      {/* La strate qui se remplit. Pleine largeur et à angles vifs plutôt
            qu'une gouttière arrondie : c'est une couche qui monte, pas une jauge
            de tableau de bord.

            Le rail est en `stone-500` et non dans le gris des séparateurs : un
            rail invisible ne dit pas ce qui reste, et c'est justement ce qu'on
            est venu montrer. */}
      <span aria-hidden className="mt-pas-4 block h-1 w-full overflow-hidden bg-stone-500">
        <span
          className="block h-full bg-stone-50"
          style={{ width: `${Math.round(part * 100)}%` }}
        />
      </span>

      <p className="text-mono mt-pas-2 font-mono text-stone-400 tabular-nums">
        {t("restant", { restant, suivant: niveau + 1 })}
      </p>
    </Infobulle>
  );
}

/**
 * La bande est centrée et bornée : étalée sur toute la largeur du panneau, les
 * deux mesures se seraient retrouvées aux extrémités de l'écran, sans rapport
 * l'une avec l'autre. Elles se lisent ensemble, donc elles tiennent ensemble.
 *
 * Sur un téléphone, la borne ne borne plus rien — la fenêtre est déjà plus
 * étroite qu'elle — et c'est la gouttière qui écarte. Elle se resserre donc,
 * puis reprend son ampleur quand la largeur revient.
 */
export function ProgressionDuCairn({ streak, xp }: { streak: number; xp: number }) {
  return (
    <div className="pt-pas-8 gap-pas-4 md:gap-pas-16 mx-auto grid w-full max-w-2xl grid-cols-2 items-start border-t border-stone-700">
      <Serie streak={streak} />
      <Niveau xp={xp} />
    </div>
  );
}
