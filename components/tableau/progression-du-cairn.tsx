import { useTranslations } from "next-intl";
import { IndiceTactile, Infobulle } from "@/components/ui/infobulle";
import { avancementDuNiveau } from "@/lib/domain/progression";

/**
 * La progression, en bande sous le cairn. C'est la seule récompense du
 * produit (on ne félicite pas, on montre ce qui est construit), d'où le grand
 * chiffre.
 *
 * La série porte l'ember, seule occurrence du produit. Le niveau a sa barre de
 * part parcourue, en gris et jamais en accent : sur ce panneau, le lichen
 * appartient au sommet du cairn. Pas de cartes : ce panneau n'a aucun
 * contenant. Les explications passent par `Infobulle`, qui s'ouvre aussi au
 * doigt — un survol seul les cacherait sur téléphone.
 */

const ETIQUETTE = "text-mono font-mono tracking-[0.14em] text-stone-400 uppercase";
const CHIFFRE = "font-display text-nombre mt-pas-2 leading-none font-medium tabular-nums";

function Serie({ streak }: { streak: number }) {
  const t = useTranslations("tableau.aujourdhui.progression");

  if (streak === 0) {
    // Centré comme le niveau, pour que les deux mesures restent ensemble.
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

      {/* Angles vifs : une strate qui monte, pas une jauge. Le rail est en
          `stone-500` et non dans le gris des séparateurs, sinon il ne dirait
          pas ce qui reste. */}
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
 * Centrée et bornée, pour que les deux mesures se lisent ensemble plutôt
 * qu'aux deux bords de l'écran. Sur téléphone, c'est la gouttière qui écarte :
 * elle s'y resserre.
 */
export function ProgressionDuCairn({ streak, xp }: { streak: number; xp: number }) {
  return (
    <div className="pt-pas-8 gap-pas-4 md:gap-pas-16 mx-auto grid w-full max-w-2xl grid-cols-2 items-start border-t border-stone-700">
      <Serie streak={streak} />
      <Niveau xp={xp} />
    </div>
  );
}
