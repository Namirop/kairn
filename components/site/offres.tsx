import { useTranslations } from "next-intl";
import { PLAFOND_GRATUIT, PLAFOND_PAYANT } from "@/lib/domain/plafond-du-plan";
import { PRIX_ANNUEL, PRIX_MENSUEL } from "@/lib/domain/prix";
import { useLangue } from "@/lib/i18n/use-langue";
import { cn } from "@/lib/utils";

/**
 * Les deux offres, côte à côte.
 *
 * Deux colonnes parce qu'on achète en comparant, et qu'une comparaison sur deux
 * écrans n'en est pas une. C'est le seul endroit du produit où deux blocs de
 * même forme se répondent : ailleurs, une grille de cartes identiques serait le
 * signe qu'on n'a pas su hiérarchiser. Ici, l'égalité de forme est le propos —
 * ce qui diffère entre les deux doit sauter aux yeux, donc tout le reste doit
 * être identique.
 *
 * **Une seule ligne les sépare vraiment** : le nombre de concepts. Le dire est
 * plus honnête que d'aligner sept fonctions cochées des deux côtés pour donner
 * du volume à la colonne payante — et ça se vérifie, puisque rien d'autre dans
 * le produit ne lit le plan.
 *
 * **C'est donc lui qui porte la display, et le prix qui passe dessous.** Les
 * deux colonnes ouvraient sur leur prix en grand : sept euros contre zéro, ce
 * qui met en avant la seule chose dont le visiteur se méfie et enterre la seule
 * qu'il compare. Le rapport de un à dix se lit maintenant de loin, et le prix
 * arrive après, à la taille d'un renseignement — ce qu'il est, à sept euros.
 *
 * **La colonne vendue est posée sur du papier, l'autre reste à plat sur
 * l'ombre.** Elle se désignait par un filet de lichen, qui était le seul accent
 * de la page ; le contraste de matière dit la même chose plus fort, sans dépenser
 * la couleur, et c'est la forme que ce produit donne partout à ce qui compte. Le
 * rembourrage est le même des deux côtés — sans quoi les deux colonnes ne se
 * liraient plus sur les mêmes lignes, et une comparaison désalignée n'en est pas
 * une.
 */

export function Offres() {
  const t = useTranslations("site.tarifs.offres");
  // Premium n'est pas vendu en anglais (décision du 08/10) : la colonne payante
  // y dit la limite, sans prix en euros ni rien qui mène à une caisse.
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
 * La colonne payante, là où elle ne se vend pas.
 *
 * Elle garde sa place et sa surface : la comparaison reste lisible, et ce qui
 * manque se dit au lieu de disparaître. Pas de nombre en display — on ne met
 * pas en avant ce qu'on ne peut pas offrir.
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
  /** L'offre payante. C'est elle qui est posée. */
  vendue?: boolean;
}) {
  const t = useTranslations("site.tarifs.offres");

  return (
    <div className={cn("p-pas-6 md:p-pas-8", vendue && "rounded-carte bg-surface-papier")}>
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">{nom}</p>

      {/* Le nombre est la seule chose qui distingue les deux offres. Il prend
          donc la display et l'échelle des grands nombres du produit — la même
          que le compteur du jour, qui est l'autre chiffre qu'on vient lire. La
          colonne gratuite le porte en gris : elles ne se valent pas, et le dire
          par la teinte évite de le dire par un badge. */}
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
