import { Achat, Renouvellement } from "@/components/reglages/gestes-de-loffre";
import { PLAFOND_PAYANT, type Plan } from "@/lib/domain/plafond-du-plan";

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
 * chiffres en mono comme partout où ce produit affiche une donnée. Le seul
 * poids visuel est sur le nom de l'offre et sur le nombre de concepts, parce
 * que c'est ce qu'on vient vérifier.
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
};

export function TonOffre({ plan, plafond, terme, resilieALaFin, ouvert, retourDePaiement }: Props) {
  const paye = plan !== "GRATUIT";

  return (
    <section className="mt-pas-12">
      <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">Ton offre</h2>

      <div className="p-pas-4 md:p-pas-6 rounded-champ bg-surface-papier mt-pas-3">
        <div className="gap-pas-4 flex flex-wrap items-baseline justify-between">
          <p className="text-corps font-semibold text-stone-900">{paye ? "Complet" : "Gratuit"}</p>
          <p className="text-petit font-mono text-stone-700 tabular-nums">
            {plafond} concepts par mois
          </p>
        </div>

        <p className="mt-pas-1 text-petit max-w-prose text-stone-500">
          <Etat
            paye={paye}
            terme={terme}
            resilieALaFin={resilieALaFin}
            ouvert={ouvert}
            retourDePaiement={retourDePaiement}
          />
        </p>

        <div className="mt-pas-6">
          {paye ? <Renouvellement resilieALaFin={resilieALaFin} /> : <Achat ouvert={ouvert} />}
        </div>
      </div>
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
}: Omit<Props, "plan" | "plafond"> & { paye: boolean }) {
  if (paye && resilieALaFin) {
    return (
      <>
        Ton abonnement est arrêté. L&apos;accès court jusqu&apos;au {terme}, puis tu retrouves{" "}
        l&apos;offre gratuite. Rien n&apos;est supprimé, jamais.
      </>
    );
  }

  if (paye) return <>Renouvelé le {terme}. Tu peux arrêter quand tu veux.</>;

  // Le retour de Stripe et l'arrivée du webhook sont deux chemins distincts, et
  // le navigateur gagne souvent la course. Sans cette phrase, quelqu'un qui
  // vient de payer lit « Gratuit » et croit son paiement perdu.
  if (retourDePaiement) {
    return (
      <>Ton paiement est passé. Il faut quelques secondes pour qu&apos;il arrive jusqu&apos;ici.</>
    );
  }

  if (!ouvert) return <>Le paiement n&apos;est pas encore ouvert.</>;

  return (
    <>
      L&apos;offre complète ouvre {PLAFOND_PAYANT} concepts par mois, sur la même période que la
      tienne.
    </>
  );
}
