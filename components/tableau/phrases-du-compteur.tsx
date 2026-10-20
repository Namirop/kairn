import Link from "next/link";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/auth/routes";
import { PLAFOND_SESSION } from "@/lib/domain/selection-session";

/**
 * Le compteur à zéro. La journée faite se reconnaît à ce qu'on a revu : le
 * plafond est journalier, « calme » serait faux si des concepts attendent derrière.
 */
export function PhraseDuJour({
  aDesAtoms,
  questionsEnRoute,
  faitsAujourdhui,
}: {
  aDesAtoms: boolean;
  questionsEnRoute: boolean;
  faitsAujourdhui: number;
}) {
  const t = useTranslations("tableau.aujourdhui.compteur");

  if (!aDesAtoms) return <>{t("rienDepose")}</>;

  if (questionsEnRoute) return <>{t("questionsEnRoute")}</>;

  if (faitsAujourdhui > 0) return <>{t("journeeFaite", { nombre: faitsAujourdhui })}</>;

  return <>{t("calme")}</>;
}

/** Le plafond cité est celui de la personne ; la journée entamée, `PhraseDuJour` la dit. */
export function PourquoiCertainsAttendent({
  enAttente,
  plafond,
}: {
  enAttente: number;
  plafond: number;
}) {
  const t = useTranslations("tableau.aujourdhui.compteur");
  const lien = (morceau: React.ReactNode) => <Lien>{morceau}</Lien>;

  return (
    <>
      {t("enAttente", { nombre: enAttente })}{" "}
      {plafond === PLAFOND_SESSION
        ? t.rich("plafondParDefaut", { plafond, lien })
        : t.rich("plafondRegle", { plafond, lien })}{" "}
      {t("reste")}
    </>
  );
}

function Lien({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href={ROUTES.reglages}
      className="rounded-galet underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
    >
      {children}
    </Link>
  );
}
