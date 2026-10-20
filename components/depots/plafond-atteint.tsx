import Link from "next/link";
import { useTranslations } from "next-intl";
import { BlocDetache } from "@/components/coquille/bloc-detache";
import { ListeDattente } from "@/components/depots/liste-dattente";
import { ROUTES } from "@/lib/auth/routes";
import { PLAFOND_PAYANT } from "@/lib/domain/plafond-du-plan";
import { PRIX_MENSUEL } from "@/lib/domain/prix";
import { useLangue } from "@/lib/i18n/use-langue";

/**
 * La période (le mois depuis l'inscription, sans report) est pleine. Ce n'est
 * pas une erreur. L'offre ne va qu'au compte gratuit arrêté par les concepts ;
 * qui n'a rien à acheter peut se signaler. Premium ne se vend qu'en français.
 */

type Props = {
  /** Déjà dit dans le fuseau de l'utilisateur. */
  remiseAZero: string;
  inscrit: boolean;
  /** Confondre les deux dirait « autour de cinquante concepts » à qui en a douze. */
  motif: "concepts" | "depots";
  limite: number;
  /** Vrai seulement si l'offre ouvrirait vraiment quelque chose et qu'elle est en vente. */
  offreAProposer: boolean;
};

export function PlafondAtteint({ remiseAZero, inscrit, motif, limite, offreAProposer }: Props) {
  const t = useTranslations("depots.formulaire.plafond");
  const langue = useLangue();
  const horsVente = offreAProposer && langue !== "FR";

  return (
    <BlocDetache className="max-w-xl">
      {/* Mêmes mots que le refus serveur. « Autour de » pour les concepts
          seulement : le dernier dépôt peut dépasser le plafond. */}
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

/** Un lien, pas les boutons de paiement : l'achat vit à un seul endroit. */
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
