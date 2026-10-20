import { useTranslations } from "next-intl";
import { PLAFOND_GRATUIT, PLAFOND_PAYANT } from "@/lib/domain/plafond-du-plan";
import { PRIX_ANNUEL, PRIX_MENSUEL } from "@/lib/domain/prix";
import { useLangue } from "@/lib/i18n/use-langue";
import { cn } from "@/lib/fusion-des-classes";

/**
 * Les deux offres, de forme identique pour que saute aux yeux la seule
 * différence que le produit lit du plan : le nombre de concepts, en display.
 * Même rembourrage des deux côtés, pour que les colonnes s'alignent.
 */

export function Offres() {
  const t = useTranslations("site.tarifs.offres");
  // Premium n'est pas vendu en anglais : ni prix ni chemin vers une caisse.
  const vendable = useLangue() === "FR";

  return (
    <div className="gap-pas-4 md:gap-pas-6 grid items-start md:grid-cols-2">
      <Offre
        nom={t("gratuit.nom")}
        prix={t("gratuit.prix")}
        cadence={t("gratuit.cadence")}
        concepts={PLAFOND_GRATUIT}
        raison={t("gratuit.raison")}
      />

      {vendable ? (
        <Offre
          nom={t("complet.nom")}
          prix={t("complet.prix", { prix: PRIX_MENSUEL })}
          cadence={t("complet.cadence")}
          second={t("complet.second", { annuel: PRIX_ANNUEL })}
          concepts={PLAFOND_PAYANT}
          raison={t("complet.raison")}
          vendue
        />
      ) : (
        <PremiumIndisponible />
      )}
    </div>
  );
}

/**
 * La colonne payante là où elle ne se vend pas : elle garde sa place pour que
 * le manque se dise, sans nombre en display pour ce qu'on ne peut offrir.
 */
function PremiumIndisponible() {
  const t = useTranslations("site.tarifs.offres");

  return (
    <div className="p-pas-6 md:p-pas-8 rounded-carte bg-surface-papier">
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        {t("indisponible.nom")}
      </p>
      <p className="mt-pas-4 text-h2-app font-semibold text-stone-900">{t("indisponible.titre")}</p>
      <p className="mt-pas-3 text-petit text-stone-500">
        {t("indisponible.texte", { concepts: PLAFOND_PAYANT })}
      </p>
    </div>
  );
}

function Offre({
  nom,
  prix,
  cadence,
  second,
  concepts,
  raison,
  vendue = false,
}: {
  nom: string;
  prix: string;
  cadence: string;
  second?: string;
  concepts: number;
  raison: string;
  /** L'offre payante, la seule posée sur une surface. */
  vendue?: boolean;
}) {
  const t = useTranslations("site.tarifs.offres");

  return (
    <div className={cn("p-pas-6 md:p-pas-8", vendue && "rounded-carte bg-surface-papier")}>
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">{nom}</p>

      <p
        className={cn(
          "mt-pas-4 font-display text-nombre leading-none font-medium tabular-nums",
          vendue ? "text-stone-900" : "text-stone-500",
        )}
      >
        {concepts}
      </p>
      <p className="mt-pas-2 text-corps text-stone-900">{t("conceptsParMois")}</p>

      <div className="mt-pas-6 pt-pas-6 border-t border-stone-300/70">
        <p className="gap-pas-2 flex flex-wrap items-baseline">
          <span className="text-h2-app font-semibold tabular-nums">{prix}</span>
          <span className="text-petit text-stone-500">{cadence}</span>
        </p>

        {second ? <p className="mt-pas-1 text-mono font-mono text-stone-500">{second}</p> : null}

        <p className="mt-pas-3 text-petit text-stone-500">{raison}</p>
      </div>
    </div>
  );
}
