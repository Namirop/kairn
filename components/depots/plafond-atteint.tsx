import Link from "next/link";
import { ListeDattente } from "@/components/depots/liste-dattente";
import { ROUTES } from "@/lib/auth/routes";
import { PLAFOND_PAYANT } from "@/lib/domain/plafond-du-plan";
import { PRIX_MENSUEL } from "@/lib/domain/prix";

/**
 * Ce qu'on montre quand la période est pleine.
 *
 * La période est le mois, pas la journée : elle court depuis la date
 * d'inscription et se renouvelle en `use-it-or-lose-it`.
 *
 * Ce n'est pas une erreur : l'utilisateur n'a rien fait de mal. L'écran dit ce
 * qui se passe, quand ça repart, et ouvre une porte — mais **la porte n'est pas
 * la même pour tout le monde**, et c'est tout l'objet de ce composant. Un compte
 * gratuit arrêté par les concepts a une réponse qui coûte sept euros. Un compte
 * qui paie déjà, ou qui bute sur le nombre de dépôts, n'a rien à acheter : lui
 * proposer une offre serait lui vendre ce qu'il a. La seule suite utile est
 * alors de se signaler.
 */

type Props = {
  /** Quand le compteur repart, déjà dit dans le fuseau de l'utilisateur. */
  remiseAZero: string;
  inscrit: boolean;
  /**
   * Laquelle des deux limites a fermé la période.
   *
   * Elles ne se disent pas pareil et se confondre coûte cher : annoncer
   * « autour de trente concepts » à quelqu'un qui en a consommé douze mais
   * déposé soixante fois, c'est lui décrire un bug.
   */
  motif: "concepts" | "depots";
  /** Le nombre atteint : des concepts ou des dépôts selon le motif. */
  limite: number;
  /** Vrai seulement si l'offre complète ouvrirait vraiment quelque chose, et qu'elle est en vente. */
  offreAProposer: boolean;
};

export function PlafondAtteint({ remiseAZero, inscrit, motif, limite, offreAProposer }: Props) {
  return (
    <div className="border-lichen pl-pas-4 gap-pas-3 flex max-w-xl flex-col border-l-2">
      {/* Les mêmes mots que le refus côté serveur : c'est la même limite.
          « Autour de » pour les concepts seulement — un dépôt rend ce qu'il
          rend, donc le dernier de la période peut passer le plafond sans qu'on
          l'ait mal compté. Des dépôts, eux, se comptent un par un. */}
      <p className="text-corps text-pretty text-stone-900">
        {motif === "concepts"
          ? `Tu as atteint la limite du mois, autour de ${limite} concepts.`
          : `Tu as atteint la limite du mois, ${limite} dépôts.`}{" "}
        Le compteur repart {remiseAZero}.
      </p>

      {offreAProposer ? <Offre /> : <Signalement inscrit={inscrit} motif={motif} />}
    </div>
  );
}

/**
 * La porte, pour qui peut la prendre.
 *
 * Un lien vers les réglages, et non les boutons de paiement : l'achat vit à un
 * seul endroit du produit, et le dupliquer ici en ferait un troisième geste
 * d'argent à surveiller. C'est aussi le partage que le produit tient déjà —
 * sur la page de tarifs on décide, dans les réglages on paie. Ici on découvre
 * qu'il y a une réponse.
 */
function Offre() {
  return (
    <>
      <p className="text-petit max-w-prose text-pretty text-stone-500">
        L&apos;offre complète en ouvre{" "}
        <span className="font-mono tabular-nums">{PLAFOND_PAYANT}</span> par mois, pour{" "}
        <span className="font-mono tabular-nums">{PRIX_MENSUEL} €</span>. Ce que tu as déjà déposé
        ne bouge pas, et les révisions du jour continuent.
      </p>

      <Link
        href={ROUTES.reglages}
        className="rounded-galet text-petit w-fit text-stone-900 underline decoration-stone-300 underline-offset-4 transition-colors hover:decoration-stone-900"
      >
        Voir l&apos;offre
      </Link>
    </>
  );
}

/** Pour qui n'a rien à acheter : le seul retour utile est de dire que ça gêne. */
function Signalement({ inscrit, motif }: { inscrit: boolean; motif: "concepts" | "depots" }) {
  return (
    <>
      <p className="text-petit max-w-prose text-pretty text-stone-500">
        Cette limite tient le coût des appels au modèle pendant que Kairn se construit. Si elle te
        gêne, dis-le : c&apos;est le signal qui décidera de la suite.
      </p>

      <ListeDattente inscrit={inscrit} motif={motif} />
    </>
  );
}
