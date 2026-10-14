import Link from "next/link";
import { useTranslations } from "next-intl";
import { AttenteDuPaiement } from "@/components/reglages/attente-du-paiement";
import { Portail, Renouvellement } from "@/components/reglages/gestes-de-loffre";
import { OffreComplete } from "@/components/reglages/offre-complete";
import { ROUTES } from "@/lib/auth/routes";
import { type Plan } from "@/lib/domain/plafond-du-plan";
import { useLangue } from "@/lib/i18n/use-langue";

/**
 * L'offre du compte, et le geste qui la change.
 *
 * Ici on paie ; la comparaison des offres vit sur la page de tarifs. Le
 * registre est donc celui des réglages, pas celui d'une page de vente.
 *
 * En anglais, rien ne se vend : Premium n'y est pas ouvert. Ni offre à prendre,
 * ni lien vers les tarifs, ni portail pour qui n'a jamais payé. Un compte qui
 * paie déjà garde ses gestes et son portail.
 */

type Props = {
  /** Le plan qui vaut à cet instant, terme dépassé déjà pris en compte. */
  plan: Plan;
  plafond: number;
  /** Le terme, déjà dit dans le fuseau de l'utilisateur. Nul si le compte n'a jamais payé. */
  terme: string | null;
  resilieALaFin: boolean;
  /** Faux quand les clés Stripe manquent : l'écran informe alors sans proposer. */
  ouvert: boolean;
  /** On revient de Stripe, paiement accepté — le webhook n'est peut-être pas encore passé. */
  retourDePaiement: boolean;
  /**
   * Le compte a un dossier chez Stripe, même sans avoir jamais payé. Sans
   * dossier, le lien vers le portail mènerait à une erreur.
   */
  dossier: boolean;
};

export function TonOffre({
  plan,
  plafond,
  terme,
  resilieALaFin,
  ouvert,
  retourDePaiement,
  dossier,
}: Props) {
  const t = useTranslations("compte.offre");
  const paye = plan !== "GRATUIT";
  // Rien ne mène vers une caisse en euros depuis l'interface anglaise.
  const vend = useLangue() === "FR";
  // Le portail suppose un dossier chez Stripe ; sans vente, il reste à qui paie déjà.
  const portail = dossier && ouvert && (vend || paye);

  return (
    <section className="mt-pas-12">
      <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        {t("titre")}
      </h2>

      <div className="p-pas-4 md:p-pas-6 rounded-champ bg-surface-papier mt-pas-3">
        <p className="text-h2-app leading-none font-semibold text-stone-900">
          {paye ? t("complet") : t("gratuit")}
        </p>
        <p className="mt-pas-2 text-petit font-mono text-stone-500 tabular-nums">
          {t("parMois", { plafond })}
        </p>

        <p className="mt-pas-4 pt-pas-4 text-petit max-w-prose border-t border-stone-300/70 text-stone-500">
          <Etat
            paye={paye}
            terme={terme}
            resilieALaFin={resilieALaFin}
            ouvert={ouvert}
            vend={vend}
            retourDePaiement={retourDePaiement}
          />
        </p>

        {retourDePaiement && !paye ? (
          <div className="mt-pas-3">
            <AttenteDuPaiement />
          </div>
        ) : null}

        {!paye && !vend ? (
          <p className="mt-pas-3 text-petit max-w-prose text-stone-500">{t("indisponible")}</p>
        ) : null}

        {!paye && !ouvert && vend ? (
          <p className="mt-pas-4">
            <Link
              href={ROUTES.tarifs}
              className="rounded-galet text-petit text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
            >
              {t("voirTarifs")}
            </Link>
          </p>
        ) : null}

        {paye || portail ? (
          <div className="gap-pas-4 mt-pas-6 flex flex-wrap items-center">
            {paye ? <Renouvellement resilieALaFin={resilieALaFin} /> : null}
            {portail ? <Portail /> : null}
          </div>
        ) : null}
      </div>

      {/* Une carte sœur et non un bloc dans la première : emboîtées, les deux
          surfaces sont trop proches en luminance pour se séparer. */}
      {!paye && ouvert && vend ? <OffreComplete /> : null}
    </section>
  );
}

/** Ce que la situation a de particulier, en une phrase. Il y en a toujours exactement une. */
function Etat({
  paye,
  terme,
  resilieALaFin,
  ouvert,
  vend,
  retourDePaiement,
}: Omit<Props, "plan" | "plafond" | "dossier"> & { paye: boolean; vend: boolean }) {
  const t = useTranslations("compte.offre.etat");

  if (paye && resilieALaFin) return <>{t("arrete", { terme: terme ?? "" })}</>;

  if (paye && retourDePaiement) return <>{t("paye", { terme: terme ?? "" })}</>;

  if (paye) return <>{t("renouvele", { terme: terme ?? "" })}</>;

  // Le navigateur revient souvent de Stripe avant le webhook : sans cette
  // phrase, on lirait « Gratuit » juste après avoir payé.
  if (retourDePaiement) return <>{t("enRoute")}</>;

  // En anglais, la fermeture du paiement ne se dit pas : il n'y a rien à
  // attendre, et la phrase qui suit la limite le dit déjà.
  if (!ouvert && vend) return <>{t("ferme")}</>;

  return <>{t("gratuit")}</>;
}
