import Link from "next/link";
import { useTranslations } from "next-intl";
import { BlocDetache } from "@/components/coquille/bloc-detache";
import { ListeDattente } from "@/components/depots/liste-dattente";
import { ROUTES } from "@/lib/auth/routes";
import { PLAFOND_PAYANT } from "@/lib/domain/plafond-du-plan";
import { PRIX_MENSUEL } from "@/lib/domain/prix";
import { useLangue } from "@/lib/i18n/use-langue";

/**
 * Ce qu'on montre quand la période (le mois, depuis la date d'inscription, en
 * `use-it-or-lose-it`) est pleine. Ce n'est pas une erreur.
 *
 * La porte dépend du cas : un compte gratuit arrêté par les concepts se voit
 * proposer l'offre ; un compte qui paie déjà ou qui bute sur le nombre de
 * dépôts n'a rien à acheter, et on lui propose de se signaler. Premium ne se
 * vend qu'en français : ailleurs, le signalement remplace l'offre.
 */

type Props = {
  /** Quand le compteur repart, déjà dit dans le fuseau de l'utilisateur. */
  remiseAZero: string;
  inscrit: boolean;
  /**
   * Laquelle des deux limites a fermé la période. Les confondre décrirait un
   * bug : « autour de cinquante concepts » à qui en a douze mais a déposé cent
   * fois.
   */
  motif: "concepts" | "depots";
  /** Le nombre atteint : des concepts ou des dépôts selon le motif. */
  limite: number;
  /** Vrai seulement si l'offre complète ouvrirait vraiment quelque chose, et qu'elle est en vente. */
  offreAProposer: boolean;
};

export function PlafondAtteint({ remiseAZero, inscrit, motif, limite, offreAProposer }: Props) {
  const t = useTranslations("depots.formulaire.plafond");
  const langue = useLangue();
  const horsVente = offreAProposer && langue !== "FR";

  return (
    <BlocDetache className="max-w-xl">
      {/* Les mêmes mots que le refus côté serveur. « Autour de » pour les
          concepts seulement : le dernier dépôt de la période peut dépasser le
          plafond, alors que les dépôts se comptent un par un. */}
      <div className="gap-pas-3 flex flex-col">
        <p className="text-corps text-pretty text-stone-900">
          {motif === "concepts" ? t("concepts", { limite }) : t("depots", { limite })}{" "}
          {t("remiseAZero", { quand: remiseAZero })}
        </p>

        {offreAProposer && !horsVente ? (
          <Offre />
        ) : (
          <Signalement inscrit={inscrit} motif={motif} horsVente={horsVente} />
        )}
      </div>
    </BlocDetache>
  );
}

/**
 * Un lien vers les réglages, pas les boutons de paiement : l'achat vit à un
 * seul endroit du produit.
 */
function Offre() {
  const t = useTranslations("depots.formulaire.plafond");

  return (
    <>
      <p className="text-petit max-w-prose text-pretty text-stone-500">
        {t.rich("offre", {
          plafond: PLAFOND_PAYANT,
          prix: PRIX_MENSUEL,
          nombre: (morceau) => <span className="font-mono tabular-nums">{morceau}</span>,
        })}
      </p>

      <Link
        href={ROUTES.reglages}
        className="rounded-galet text-petit w-fit text-stone-900 underline decoration-stone-300 underline-offset-4 transition-colors hover:decoration-stone-900"
      >
        {t("voirLOffre")}
      </Link>
    </>
  );
}

/** Pour qui n'a rien à acheter : le seul retour utile est de dire que ça gêne. */
function Signalement({
  inscrit,
  motif,
  horsVente,
}: {
  inscrit: boolean;
  motif: "concepts" | "depots";
  horsVente: boolean;
}) {
  const t = useTranslations("depots.formulaire.plafond");

  return (
    <>
      <p className="text-petit max-w-prose text-pretty text-stone-500">
        {t("signalement")}
        {horsVente ? ` ${t("horsVente")}` : null}
      </p>

      <ListeDattente inscrit={inscrit} motif={motif} />
    </>
  );
}
