import Link from "next/link";
import { AttenteDuPaiement } from "@/components/reglages/attente-du-paiement";
import { Portail, Renouvellement } from "@/components/reglages/gestes-de-loffre";
import { OffreComplete } from "@/components/reglages/offre-complete";
import { ROUTES } from "@/lib/auth/routes";
import { type Plan } from "@/lib/domain/plafond-du-plan";

/**
 * L'offre du compte, et le geste qui la change.
 *
 * Ici on paie ; sur la page de tarifs, on décide. La comparaison des deux
 * colonnes a déjà eu lieu — quelqu'un qui arrive sur cet écran a choisi, il lui
 * reste à cliquer. Refaire la grille comparative ici serait redemander une
 * décision déjà prise, et donner à un panneau de réglages l'allure d'une page
 * de vente.
 *
 * Le registre est donc celui des réglages : pas de display, pas d'accent, les
 * chiffres en mono comme partout où ce produit affiche une donnée.
 *
 * **Le nom de l'offre et son plafond sont un couple, et ils se touchent.** Ils
 * vivaient aux deux extrémités d'une rangée en `justify-between` : sur un écran
 * large, « Complet » et « 500 concepts par mois » se retrouvaient à neuf cents
 * pixels l'un de l'autre, et l'un des deux se lisait sans l'autre. Ce qu'on vient
 * vérifier sur cet écran, c'est justement leur rapport.
 *
 * **Un filet sépare l'offre de ce qu'on en fait.** Sans lui, l'identité, l'état
 * et les gestes s'empilaient à intervalle égal, et la carte n'avait pas de
 * structure — trois blocs de la même importance dont aucun n'ouvrait.
 *
 * **Les deux gestes tiennent la même rangée.** « Arrêter le renouvellement » et
 * « Factures et moyen de paiement » étaient séparés de soixante pixels de vide,
 * fabriqués par la place que chaque bouton réservait à un message d'erreur qui
 * n'arrive jamais. Ils appartiennent au même sujet — ce que je fais de mon
 * abonnement —, ils se lisent ensemble.
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
   * Le compte a un dossier chez Stripe.
   *
   * Vrai dès qu'il a approché le paiement une fois, même sans jamais avoir payé.
   * C'est ce qui décide d'afficher le portail : sans dossier, il n'y a ni
   * facture ni carte à y voir, et le lien mènerait à une erreur.
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
  const paye = plan !== "GRATUIT";

  return (
    <section className="mt-pas-12">
      <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">Ton offre</h2>

      <div className="p-pas-4 md:p-pas-6 rounded-champ bg-surface-papier mt-pas-3">
        <p className="text-h2-app leading-none font-semibold text-stone-900">
          {paye ? "Complet" : "Gratuit"}
        </p>
        <p className="mt-pas-2 text-petit font-mono text-stone-500 tabular-nums">
          {plafond} concepts par mois
        </p>

        <p className="mt-pas-4 pt-pas-4 text-petit max-w-prose border-t border-stone-300/70 text-stone-500">
          <Etat
            paye={paye}
            terme={terme}
            resilieALaFin={resilieALaFin}
            ouvert={ouvert}
            retourDePaiement={retourDePaiement}
          />
        </p>

        {retourDePaiement && !paye ? (
          <div className="mt-pas-3">
            <AttenteDuPaiement />
          </div>
        ) : null}

        {!paye && !ouvert ? (
          <p className="mt-pas-4">
            <Link
              href={ROUTES.tarifs}
              className="rounded-galet text-petit text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
            >
              Voir les tarifs
            </Link>
          </p>
        ) : null}

        {paye || (dossier && ouvert) ? (
          <div className="gap-pas-4 mt-pas-6 flex flex-wrap items-center">
            {paye ? <Renouvellement resilieALaFin={resilieALaFin} /> : null}
            {dossier && ouvert ? <Portail /> : null}
          </div>
        ) : null}
      </div>

      {/* L'offre à prendre est une carte sœur, pas un bloc dans la première.

          Ce sont deux sujets — ce que tu as, ce que tu peux prendre — et les
          emboîter donnait une surface teintée posée sur du papier, deux tons
          qui ne se séparent que de quelques centièmes de luminance : le bloc qui
          devait ressortir se fondait dans celui qui le contenait. Sur l'ombre du
          panneau, le lichen tranche. */}
      {!paye && ouvert ? <OffreComplete /> : null}
    </section>
  );
}

/** Ce que la situation a de particulier, en une phrase. Il y en a toujours exactement une. */
function Etat({
  paye,
  terme,
  resilieALaFin,
  ouvert,
  retourDePaiement,
}: Omit<Props, "plan" | "plafond" | "dossier"> & { paye: boolean }) {
  if (paye && resilieALaFin) {
    return (
      <>
        Ton abonnement est arrêté. L&apos;accès court jusqu&apos;au {terme}, puis tu retrouves{" "}
        l&apos;offre gratuite. Rien n&apos;est supprimé, jamais.
      </>
    );
  }

  if (paye && retourDePaiement) {
    return <>Ton paiement est passé. Ton offre court jusqu&apos;au {terme}.</>;
  }

  if (paye) return <>Renouvelé le {terme}. Tu peux arrêter quand tu veux.</>;

  // Le retour de Stripe et l'arrivée du webhook sont deux chemins distincts, et
  // le navigateur gagne souvent la course. Sans cette phrase, quelqu'un qui
  // vient de payer lit « Gratuit » et croit son paiement perdu.
  if (retourDePaiement) {
    return (
      <>
        Ton paiement est passé. Il faut quelques secondes pour qu&apos;il arrive jusqu&apos;ici —
        cet écran se met à jour tout seul.
      </>
    );
  }

  if (!ouvert) return <>Le paiement n&apos;est pas encore ouvert.</>;

  return <>Tout ce que le produit sait faire est ouvert. C&apos;est le volume qui est borné.</>;
}
